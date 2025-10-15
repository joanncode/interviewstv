<?php

namespace App\Controllers;

use App\Services\AIContentModerationService;
use App\Core\Database;

/**
 * AI Content Moderation Controller
 * REST API endpoints for AI-powered content moderation
 */
class AIContentModerationController
{
    private AIContentModerationService $moderationService;

    public function __construct()
    {
        $pdo = Database::getConnection();
        $this->moderationService = new AIContentModerationService($pdo);
    }

    /**
     * Start content moderation session
     * POST /api/content-moderation/sessions
     */
    public function startSession()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }
            
            $interviewId = $input['interview_id'] ?? '';
            $userId = $input['user_id'] ?? 0;
            $options = $input['options'] ?? [];
            
            if (empty($interviewId) || empty($userId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Interview ID and User ID are required']);
                return;
            }
            
            $result = $this->moderationService->startModerationSession($interviewId, $userId, $options);
            
            if ($result['success']) {
                http_response_code(201);
            } else {
                http_response_code(500);
            }
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to start moderation session: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Analyze content for moderation
     * POST /api/content-moderation/sessions/{sessionId}/analyze
     */
    public function analyzeContent($sessionId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }
            
            $contentData = $input['content_data'] ?? [];
            
            if (empty($contentData['content'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Content is required']);
                return;
            }
            
            $result = $this->moderationService->analyzeContent($sessionId, $contentData);
            
            if ($result['success']) {
                http_response_code(200);
            } else {
                http_response_code(500);
            }
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Content analysis failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Stop moderation session
     * POST /api/content-moderation/sessions/{sessionId}/stop
     */
    public function stopSession($sessionId)
    {
        try {
            $result = $this->moderationService->stopModerationSession($sessionId);
            
            if ($result['success']) {
                http_response_code(200);
            } else {
                http_response_code(500);
            }
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to stop session: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get session analytics
     * GET /api/content-moderation/sessions/{sessionId}/analytics
     */
    public function getSessionAnalytics($sessionId)
    {
        try {
            $result = $this->moderationService->getSessionAnalytics($sessionId);
            
            if ($result['success']) {
                http_response_code(200);
            } else {
                http_response_code(404);
            }
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get moderation rules
     * GET /api/content-moderation/rules
     */
    public function getModerationRules()
    {
        try {
            $result = $this->moderationService->getModerationRules();
            
            http_response_code(200);
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get rules: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Update moderation rule
     * PUT /api/content-moderation/rules/{ruleId}
     */
    public function updateModerationRule($ruleId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }
            
            $result = $this->moderationService->updateModerationRule($ruleId, $input);
            
            if ($result['success']) {
                http_response_code(200);
            } else {
                http_response_code(500);
            }
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to update rule: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Batch analyze multiple content items
     * POST /api/content-moderation/sessions/{sessionId}/batch-analyze
     */
    public function batchAnalyzeContent($sessionId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['content_items'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Content items array is required']);
                return;
            }
            
            $contentItems = $input['content_items'];
            $results = [];
            
            foreach ($contentItems as $index => $contentData) {
                $result = $this->moderationService->analyzeContent($sessionId, $contentData);
                $results[] = [
                    'index' => $index,
                    'content_id' => $contentData['content_id'] ?? "item_$index",
                    'result' => $result
                ];
            }
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'batch_results' => $results,
                'total_processed' => count($results)
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Batch analysis failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get content analysis history
     * GET /api/content-moderation/sessions/{sessionId}/history
     */
    public function getAnalysisHistory($sessionId)
    {
        try {
            $limit = $_GET['limit'] ?? 50;
            $offset = $_GET['offset'] ?? 0;
            $contentType = $_GET['content_type'] ?? null;
            
            $history = $this->getAnalysisHistoryFromDB($sessionId, $limit, $offset, $contentType);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'history' => $history,
                'pagination' => [
                    'limit' => (int)$limit,
                    'offset' => (int)$offset,
                    'total' => count($history)
                ]
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get history: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get moderation actions history
     * GET /api/content-moderation/sessions/{sessionId}/actions
     */
    public function getActionsHistory($sessionId)
    {
        try {
            $limit = $_GET['limit'] ?? 50;
            $offset = $_GET['offset'] ?? 0;
            $actionType = $_GET['action_type'] ?? null;
            
            $actions = $this->getActionsHistoryFromDB($sessionId, $limit, $offset, $actionType);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'actions' => $actions,
                'pagination' => [
                    'limit' => (int)$limit,
                    'offset' => (int)$offset,
                    'total' => count($actions)
                ]
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get actions: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get demo data for testing
     * GET /api/content-moderation/demo-data
     */
    public function getDemoData()
    {
        try {
            $result = $this->moderationService->getDemoData();
            
            http_response_code(200);
            echo json_encode($result);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get demo data: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Test content moderation with sample data
     * POST /api/content-moderation/test
     */
    public function testModeration()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }
            
            $testContent = $input['test_content'] ?? '';
            $testOptions = $input['options'] ?? [];
            
            if (empty($testContent)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Test content is required']);
                return;
            }
            
            // Create temporary session for testing
            $testSessionResult = $this->moderationService->startModerationSession(
                'test_interview_' . time(),
                1,
                $testOptions
            );
            
            if (!$testSessionResult['success']) {
                throw new Exception('Failed to create test session');
            }
            
            $sessionId = $testSessionResult['session']['session_id'];
            
            // Analyze test content
            $analysisResult = $this->moderationService->analyzeContent($sessionId, [
                'content' => $testContent,
                'type' => 'text',
                'content_id' => 'test_' . time()
            ]);
            
            // Stop test session
            $this->moderationService->stopModerationSession($sessionId);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'test_result' => $analysisResult,
                'test_session_id' => $sessionId
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Test failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get analysis history from database
     */
    private function getAnalysisHistoryFromDB(string $sessionId, int $limit, int $offset, ?string $contentType): array
    {
        $pdo = Database::getConnection();

        $sql = "SELECT
                    analysis_id, content_id, content_type, content_text,
                    toxicity_score, profanity_score, hate_speech_score,
                    harassment_score, threat_score, spam_score,
                    adult_content_score, violence_score, overall_risk_score,
                    confidence_score, processing_time_ms, timestamp
                FROM content_analysis_results
                WHERE session_id = ?";

        $params = [$sessionId];

        if ($contentType) {
            $sql .= " AND content_type = ?";
            $params[] = $contentType;
        }

        $sql .= " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get actions history from database
     */
    private function getActionsHistoryFromDB(string $sessionId, int $limit, int $offset, ?string $actionType): array
    {
        $pdo = Database::getConnection();

        $sql = "SELECT
                    action_id, analysis_id, action_type, action_reason,
                    auto_action, original_content, filtered_content,
                    severity_level, user_notified, escalated, timestamp
                FROM moderation_actions
                WHERE session_id = ?";

        $params = [$sessionId];

        if ($actionType) {
            $sql .= " AND action_type = ?";
            $params[] = $actionType;
        }

        $sql .= " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get session statistics
     * GET /api/content-moderation/sessions/{sessionId}/stats
     */
    public function getSessionStats($sessionId)
    {
        try {
            $pdo = Database::getConnection();

            // Get basic session info
            $sessionSql = "SELECT * FROM content_moderation_sessions WHERE session_id = ?";
            $sessionStmt = $pdo->prepare($sessionSql);
            $sessionStmt->execute([$sessionId]);
            $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Session not found']);
                return;
            }

            // Get analysis statistics
            $analysisSql = "SELECT
                            COUNT(*) as total_analyzed,
                            AVG(overall_risk_score) as avg_risk_score,
                            AVG(confidence_score) as avg_confidence,
                            AVG(processing_time_ms) as avg_processing_time,
                            COUNT(CASE WHEN overall_risk_score > 0.3 THEN 1 END) as violations_detected
                        FROM content_analysis_results
                        WHERE session_id = ?";

            $analysisStmt = $pdo->prepare($analysisSql);
            $analysisStmt->execute([$sessionId]);
            $analysisStats = $analysisStmt->fetch(PDO::FETCH_ASSOC);

            // Get action statistics
            $actionSql = "SELECT
                            COUNT(*) as total_actions,
                            COUNT(CASE WHEN action_type = 'block' THEN 1 END) as blocks,
                            COUNT(CASE WHEN action_type = 'filter' THEN 1 END) as filters,
                            COUNT(CASE WHEN action_type = 'warn' THEN 1 END) as warnings,
                            COUNT(CASE WHEN action_type = 'quarantine' THEN 1 END) as quarantines,
                            COUNT(CASE WHEN action_type = 'escalate' THEN 1 END) as escalations
                        FROM moderation_actions
                        WHERE session_id = ?";

            $actionStmt = $pdo->prepare($actionSql);
            $actionStmt->execute([$sessionId]);
            $actionStats = $actionStmt->fetch(PDO::FETCH_ASSOC);

            // Calculate derived metrics
            $violationRate = $analysisStats['total_analyzed'] > 0
                ? ($analysisStats['violations_detected'] / $analysisStats['total_analyzed']) * 100
                : 0;

            $actionRate = $analysisStats['total_analyzed'] > 0
                ? ($actionStats['total_actions'] / $analysisStats['total_analyzed']) * 100
                : 0;

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'session_info' => $session,
                'analysis_stats' => $analysisStats,
                'action_stats' => $actionStats,
                'derived_metrics' => [
                    'violation_rate_percent' => round($violationRate, 2),
                    'action_rate_percent' => round($actionRate, 2),
                    'avg_risk_score' => round($analysisStats['avg_risk_score'], 3),
                    'avg_confidence' => round($analysisStats['avg_confidence'], 3),
                    'avg_processing_time_ms' => round($analysisStats['avg_processing_time'], 2)
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to get statistics: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Export session data
     * GET /api/content-moderation/sessions/{sessionId}/export
     */
    public function exportSessionData($sessionId)
    {
        try {
            $format = $_GET['format'] ?? 'json';

            $pdo = Database::getConnection();

            // Get session data
            $sessionSql = "SELECT * FROM content_moderation_sessions WHERE session_id = ?";
            $sessionStmt = $pdo->prepare($sessionSql);
            $sessionStmt->execute([$sessionId]);
            $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Session not found']);
                return;
            }

            // Get analysis results
            $analysisSql = "SELECT * FROM content_analysis_results WHERE session_id = ? ORDER BY timestamp";
            $analysisStmt = $pdo->prepare($analysisSql);
            $analysisStmt->execute([$sessionId]);
            $analysisResults = $analysisStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get actions
            $actionSql = "SELECT * FROM moderation_actions WHERE session_id = ? ORDER BY timestamp";
            $actionStmt = $pdo->prepare($actionSql);
            $actionStmt->execute([$sessionId]);
            $actions = $actionStmt->fetchAll(PDO::FETCH_ASSOC);

            $exportData = [
                'session' => $session,
                'analysis_results' => $analysisResults,
                'actions' => $actions,
                'export_timestamp' => date('Y-m-d H:i:s'),
                'total_items' => count($analysisResults)
            ];

            switch ($format) {
                case 'csv':
                    $this->exportAsCSV($exportData, $sessionId);
                    break;
                case 'xml':
                    $this->exportAsXML($exportData, $sessionId);
                    break;
                default:
                    header('Content-Type: application/json');
                    header('Content-Disposition: attachment; filename="moderation_session_' . $sessionId . '.json"');
                    echo json_encode($exportData, JSON_PRETTY_PRINT);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Export failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Export data as CSV
     */
    private function exportAsCSV(array $data, string $sessionId): void
    {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="moderation_session_' . $sessionId . '.csv"');

        $output = fopen('php://output', 'w');

        // Write analysis results
        if (!empty($data['analysis_results'])) {
            fputcsv($output, array_keys($data['analysis_results'][0]));
            foreach ($data['analysis_results'] as $row) {
                fputcsv($output, $row);
            }
        }

        fclose($output);
    }

    /**
     * Export data as XML
     */
    private function exportAsXML(array $data, string $sessionId): void
    {
        header('Content-Type: application/xml');
        header('Content-Disposition: attachment; filename="moderation_session_' . $sessionId . '.xml"');

        $xml = new SimpleXMLElement('<moderation_session/>');

        // Add session info
        $sessionNode = $xml->addChild('session');
        foreach ($data['session'] as $key => $value) {
            $sessionNode->addChild($key, htmlspecialchars($value));
        }

        // Add analysis results
        $analysisNode = $xml->addChild('analysis_results');
        foreach ($data['analysis_results'] as $result) {
            $resultNode = $analysisNode->addChild('result');
            foreach ($result as $key => $value) {
                $resultNode->addChild($key, htmlspecialchars($value));
            }
        }

        // Add actions
        $actionsNode = $xml->addChild('actions');
        foreach ($data['actions'] as $action) {
            $actionNode = $actionsNode->addChild('action');
            foreach ($action as $key => $value) {
                $actionNode->addChild($key, htmlspecialchars($value));
            }
        }

        echo $xml->asXML();
    }
}
