<?php

namespace App\Controllers;

use App\Services\TranslationService;
use Exception;

/**
 * Translation Controller
 * Handles real-time translation API endpoints
 */
class TranslationController
{
    private $translationService;

    public function __construct($pdo)
    {
        $this->translationService = new TranslationService($pdo);
    }

    /**
     * Start translation session
     * POST /api/translation/session/start
     */
    public function startSession($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $interviewId = $data['interview_id'] ?? null;
            $userId = $data['user_id'] ?? 1; // Default user for demo
            
            if (!$interviewId) {
                return $this->jsonResponse(['error' => 'Interview ID is required'], 400);
            }
            
            $options = [
                'source_language' => $data['source_language'] ?? 'en',
                'target_languages' => $data['target_languages'] ?? ['es', 'fr'],
                'translation_engine' => $data['translation_engine'] ?? 'google_translate',
                'auto_translate' => $data['auto_translate'] ?? true,
                'translate_transcription' => $data['translate_transcription'] ?? true,
                'translate_chat' => $data['translate_chat'] ?? true,
                'quality_threshold' => $data['quality_threshold'] ?? 0.70
            ];
            
            $session = $this->translationService->startTranslationSession($interviewId, $userId, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'session' => $session,
                'message' => 'Translation session started successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Translate text
     * POST /api/translation/translate
     */
    public function translateText($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $text = $data['text'] ?? null;
            $sourceLanguage = $data['source_language'] ?? 'en';
            $targetLanguage = $data['target_language'] ?? 'es';
            
            if (!$text) {
                return $this->jsonResponse(['error' => 'Text is required'], 400);
            }
            
            $options = [
                'engine' => $data['engine'] ?? 'google_translate',
                'source_type' => $data['source_type'] ?? 'text',
                'source_id' => $data['source_id'] ?? null,
                'interview_id' => $data['interview_id'] ?? null
            ];
            
            $translation = $this->translationService->translateText($text, $sourceLanguage, $targetLanguage, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'translation' => $translation
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Batch translate multiple texts
     * POST /api/translation/batch
     */
    public function batchTranslate($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $texts = $data['texts'] ?? [];
            $sourceLanguage = $data['source_language'] ?? 'en';
            $targetLanguages = $data['target_languages'] ?? ['es'];
            
            if (empty($texts)) {
                return $this->jsonResponse(['error' => 'Texts array is required'], 400);
            }
            
            $options = [
                'engine' => $data['engine'] ?? 'google_translate',
                'source_type' => $data['source_type'] ?? 'text',
                'source_ids' => $data['source_ids'] ?? [],
                'interview_id' => $data['interview_id'] ?? null
            ];
            
            $batchResult = $this->translationService->batchTranslate($texts, $sourceLanguage, $targetLanguages, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'batch_result' => $batchResult
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get translation session
     * GET /api/translation/session/{sessionId}
     */
    public function getSession($request, $sessionId)
    {
        try {
            $session = $this->translationService->getTranslationSession($sessionId);
            
            return $this->jsonResponse([
                'success' => true,
                'session' => $session
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update translation session
     * PUT /api/translation/session/{sessionId}
     */
    public function updateSession($request, $sessionId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $session = $this->translationService->updateTranslationSession($sessionId, $data);
            
            return $this->jsonResponse([
                'success' => true,
                'session' => $session,
                'message' => 'Translation session updated successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get supported languages
     * GET /api/translation/languages
     */
    public function getSupportedLanguages($request)
    {
        try {
            $activeOnly = isset($_GET['active_only']) ? (bool)$_GET['active_only'] : true;
            
            $languages = $this->translationService->getSupportedLanguages($activeOnly);
            
            return $this->jsonResponse([
                'success' => true,
                'languages' => $languages,
                'total' => count($languages)
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Detect language
     * POST /api/translation/detect
     */
    public function detectLanguage($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $text = $data['text'] ?? null;
            
            if (!$text) {
                return $this->jsonResponse(['error' => 'Text is required'], 400);
            }
            
            $detection = $this->translationService->detectLanguage($text);
            
            return $this->jsonResponse([
                'success' => true,
                'detection' => $detection
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get translation analytics
     * GET /api/translation/analytics
     */
    public function getAnalytics($request)
    {
        try {
            $interviewId = $_GET['interview_id'] ?? null;
            $dateRange = $_GET['date_range'] ?? 7;
            
            $options = [
                'date_range' => (int)$dateRange
            ];
            
            $analytics = $this->translationService->getTranslationAnalytics($interviewId, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'analytics' => $analytics
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get translation history
     * GET /api/translation/history
     */
    public function getTranslationHistory($request)
    {
        try {
            $interviewId = $_GET['interview_id'] ?? null;
            $limit = $_GET['limit'] ?? 50;
            $offset = $_GET['offset'] ?? 0;
            $sourceType = $_GET['source_type'] ?? null;
            
            $history = $this->getTranslationHistoryFromDB($interviewId, $limit, $offset, $sourceType);
            
            return $this->jsonResponse([
                'success' => true,
                'history' => $history['translations'],
                'total' => $history['total'],
                'limit' => (int)$limit,
                'offset' => (int)$offset
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Submit translation feedback
     * POST /api/translation/feedback
     */
    public function submitFeedback($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $translationRequestId = $data['translation_request_id'] ?? null;
            $rating = $data['rating'] ?? null;
            $userId = $data['user_id'] ?? 1;
            
            if (!$translationRequestId || !$rating) {
                return $this->jsonResponse(['error' => 'Translation request ID and rating are required'], 400);
            }
            
            if ($rating < 1 || $rating > 5) {
                return $this->jsonResponse(['error' => 'Rating must be between 1 and 5'], 400);
            }
            
            $feedback = $this->submitTranslationFeedback($translationRequestId, $userId, $rating, $data);
            
            return $this->jsonResponse([
                'success' => true,
                'feedback' => $feedback,
                'message' => 'Feedback submitted successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get translation statistics
     * GET /api/translation/stats
     */
    public function getTranslationStats($request)
    {
        try {
            $interviewId = $_GET['interview_id'] ?? null;
            $period = $_GET['period'] ?? 'today'; // today, week, month
            
            $stats = $this->calculateTranslationStats($interviewId, $period);
            
            return $this->jsonResponse([
                'success' => true,
                'stats' => $stats,
                'period' => $period
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get translation history from database
     */
    private function getTranslationHistoryFromDB(?string $interviewId, int $limit, int $offset, ?string $sourceType): array
    {
        $sql = "SELECT * FROM translation_requests WHERE 1=1";
        $params = [];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        if ($sourceType) {
            $sql .= " AND source_type = ?";
            $params[] = $sourceType;
        }

        // Get total count
        $countSql = str_replace("SELECT *", "SELECT COUNT(*)", $sql);
        $stmt = $this->translationService->pdo->prepare($countSql);
        $stmt->execute($params);
        $total = $stmt->fetchColumn();

        // Get paginated results
        $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->translationService->pdo->prepare($sql);
        $stmt->execute($params);
        $translations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'translations' => $translations,
            'total' => $total
        ];
    }

    /**
     * Submit translation feedback to database
     */
    private function submitTranslationFeedback(int $translationRequestId, int $userId, int $rating, array $data): array
    {
        $stmt = $this->translationService->pdo->prepare("
            INSERT INTO translation_feedback
            (translation_request_id, user_id, rating, feedback_type, comments,
             suggested_translation, is_helpful, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $translationRequestId,
            $userId,
            $rating,
            $data['feedback_type'] ?? 'quality',
            $data['comments'] ?? null,
            $data['suggested_translation'] ?? null,
            $data['is_helpful'] ?? null,
            date('Y-m-d H:i:s')
        ]);

        $feedbackId = $this->translationService->pdo->lastInsertId();

        // Get the created feedback
        $stmt = $this->translationService->pdo->prepare("SELECT * FROM translation_feedback WHERE id = ?");
        $stmt->execute([$feedbackId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Calculate translation statistics
     */
    private function calculateTranslationStats(?string $interviewId, string $period): array
    {
        $dateCondition = $this->getDateCondition($period);

        $sql = "
            SELECT
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(processing_time_ms) as avg_processing_time,
                SUM(LENGTH(original_text)) as total_characters,
                COUNT(DISTINCT source_language) as unique_source_languages,
                COUNT(DISTINCT target_language) as unique_target_languages
            FROM translation_requests
            WHERE created_at >= ?
        ";

        $params = [$dateCondition];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $stmt = $this->translationService->pdo->prepare($sql);
        $stmt->execute($params);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate success rate
        $stats['success_rate'] = $stats['total_requests'] > 0
            ? round(($stats['successful'] / $stats['total_requests']) * 100, 2)
            : 0;

        // Get language distribution
        $stats['language_distribution'] = $this->getLanguageDistribution($interviewId, $dateCondition);

        // Get engine performance
        $stats['engine_performance'] = $this->getEnginePerformance($interviewId, $dateCondition);

        return $stats;
    }

    /**
     * Get date condition for period
     */
    private function getDateCondition(string $period): string
    {
        switch ($period) {
            case 'today':
                return date('Y-m-d 00:00:00');
            case 'week':
                return date('Y-m-d 00:00:00', strtotime('-7 days'));
            case 'month':
                return date('Y-m-d 00:00:00', strtotime('-30 days'));
            default:
                return date('Y-m-d 00:00:00');
        }
    }

    /**
     * Get language distribution statistics
     */
    private function getLanguageDistribution(?string $interviewId, string $dateCondition): array
    {
        $sql = "
            SELECT
                source_language,
                target_language,
                COUNT(*) as count
            FROM translation_requests
            WHERE created_at >= ?
        ";

        $params = [$dateCondition];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $sql .= " GROUP BY source_language, target_language ORDER BY count DESC";

        $stmt = $this->translationService->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get engine performance statistics
     */
    private function getEnginePerformance(?string $interviewId, string $dateCondition): array
    {
        $sql = "
            SELECT
                translation_engine,
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                AVG(processing_time_ms) as avg_processing_time,
                AVG(confidence_score) as avg_confidence
            FROM translation_requests
            WHERE created_at >= ?
        ";

        $params = [$dateCondition];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $sql .= " GROUP BY translation_engine ORDER BY successful DESC";

        $stmt = $this->translationService->pdo->prepare($sql);
        $stmt->execute($params);
        $engines = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate success rates
        foreach ($engines as &$engine) {
            $engine['success_rate'] = $engine['total_requests'] > 0
                ? round(($engine['successful'] / $engine['total_requests']) * 100, 2)
                : 0;
        }

        return $engines;
    }

    /**
     * Return JSON response
     */
    private function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
