<?php

namespace App\Controllers;

use App\Services\AIInterviewRecommendationService;
use PDO;

/**
 * AI-Powered Interview Recommendation Controller
 * REST API endpoints for intelligent interview recommendations
 */
class AIRecommendationController
{
    private AIInterviewRecommendationService $recommendationService;
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->recommendationService = new AIInterviewRecommendationService($pdo);
    }

    /**
     * POST /api/ai-recommendations/sessions
     * Start AI recommendation session
     */
    public function startSession(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $interviewId = $input['interview_id'] ?? '';
            $userId = $input['user_id'] ?? 0;
            $options = $input['options'] ?? [];

            if (empty($interviewId) || empty($userId)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields: interview_id, user_id']);
                return;
            }

            $result = $this->recommendationService->startRecommendationSession($interviewId, $userId, $options);

            if ($result['success']) {
                http_response_code(201);
                echo json_encode($result);
            } else {
                http_response_code(500);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to start session: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/ai-recommendations/sessions/{sessionId}/analyze
     * Generate AI recommendations for interview
     */
    public function generateRecommendations(string $sessionId): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $interviewData = $input['interview_data'] ?? [];

            if (empty($interviewData)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing interview_data']);
                return;
            }

            $result = $this->recommendationService->generateRecommendations($sessionId, $interviewData);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(500);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to generate recommendations: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/recommendations
     * Get all recommendations for session
     */
    public function getSessionRecommendations(string $sessionId): void
    {
        try {
            $filters = [];
            
            // Parse query parameters
            if (isset($_GET['category'])) {
                $filters['category'] = $_GET['category'];
            }
            if (isset($_GET['priority'])) {
                $filters['priority'] = $_GET['priority'];
            }
            if (isset($_GET['type'])) {
                $filters['type'] = $_GET['type'];
            }
            if (isset($_GET['limit'])) {
                $filters['limit'] = (int)$_GET['limit'];
            }

            $result = $this->recommendationService->getSessionRecommendations($sessionId, $filters);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get recommendations: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/candidate-assessment
     * Get candidate assessment recommendations
     */
    public function getCandidateAssessment(string $sessionId): void
    {
        try {
            $filters = ['category' => 'candidate_assessment'];
            $result = $this->recommendationService->getSessionRecommendations($sessionId, $filters);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get candidate assessment: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/question-optimization
     * Get question optimization recommendations
     */
    public function getQuestionOptimization(string $sessionId): void
    {
        try {
            $filters = ['category' => 'question_optimization'];
            $result = $this->recommendationService->getSessionRecommendations($sessionId, $filters);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get question optimization: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/improvement-suggestions
     * Get interview improvement suggestions
     */
    public function getImprovementSuggestions(string $sessionId): void
    {
        try {
            $filters = ['category' => 'interview_improvement'];
            $result = $this->recommendationService->getSessionRecommendations($sessionId, $filters);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get improvement suggestions: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/hiring-decision
     * Get hiring decision recommendations
     */
    public function getHiringDecision(string $sessionId): void
    {
        try {
            $filters = ['category' => 'hiring_decision'];
            $result = $this->recommendationService->getSessionRecommendations($sessionId, $filters);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get hiring decision: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/analytics
     * Get session analytics and statistics
     */
    public function getSessionAnalytics(string $sessionId): void
    {
        try {
            $result = $this->recommendationService->getSessionAnalytics($sessionId);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get analytics: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/ai-recommendations/recommendations/{recommendationId}/feedback
     * Submit feedback for recommendation
     */
    public function submitFeedback(string $recommendationId): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $userId = $input['user_id'] ?? 0;
            $feedback = $input['feedback'] ?? [];

            if (empty($userId)) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing user_id']);
                return;
            }

            $result = $this->recommendationService->submitRecommendationFeedback($recommendationId, $userId, $feedback);

            if ($result['success']) {
                http_response_code(201);
                echo json_encode($result);
            } else {
                http_response_code(500);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to submit feedback: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/sessions/{sessionId}/export
     * Export session recommendations
     */
    public function exportRecommendations(string $sessionId): void
    {
        try {
            $format = $_GET['format'] ?? 'json';
            
            $result = $this->recommendationService->exportSessionRecommendations($sessionId, $format);

            if ($result['success']) {
                // Set appropriate headers for download
                $filename = $result['filename'];
                $contentType = $this->getContentType($format);
                
                header("Content-Type: {$contentType}");
                header("Content-Disposition: attachment; filename=\"{$filename}\"");
                header("Content-Length: " . $result['size']);
                
                echo $result['data'];
            } else {
                http_response_code(500);
                echo json_encode($result);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to export recommendations: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/ai-recommendations/test
     * Test with sample data
     */
    public function testWithSampleData(): void
    {
        try {
            $demoData = $this->recommendationService->getDemoData();
            
            if (!$demoData['success']) {
                http_response_code(500);
                echo json_encode($demoData);
                return;
            }

            // Start demo session
            $sessionResult = $this->recommendationService->startRecommendationSession(
                'demo_interview_001',
                1,
                $demoData['sample_settings']
            );

            if (!$sessionResult['success']) {
                http_response_code(500);
                echo json_encode($sessionResult);
                return;
            }

            $sessionId = $sessionResult['session']['session_id'];

            // Generate recommendations with demo data
            $recommendationsResult = $this->recommendationService->generateRecommendations(
                $sessionId,
                $demoData['demo_interview_data']
            );

            if ($recommendationsResult['success']) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'session_id' => $sessionId,
                    'demo_data' => $demoData,
                    'recommendations' => $recommendationsResult,
                    'message' => 'Demo test completed successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode($recommendationsResult);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to run test: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/ai-recommendations/demo-data
     * Get demo data for testing
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->recommendationService->getDemoData();
            
            http_response_code(200);
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get demo data: ' . $e->getMessage()]);
        }
    }

    /**
     * Get content type for export format
     */
    private function getContentType(string $format): string
    {
        switch ($format) {
            case 'json':
                return 'application/json';
            case 'csv':
                return 'text/csv';
            case 'html':
                return 'text/html';
            case 'markdown':
                return 'text/markdown';
            default:
                return 'application/octet-stream';
        }
    }
}
