<?php

namespace App\Controllers;

use App\Services\HighlightsService;
use Exception;

/**
 * AI-Powered Highlights Controller
 * Handles intelligent highlight detection and management API endpoints
 */
class HighlightsController
{
    private $highlightsService;

    public function __construct($pdo)
    {
        $this->highlightsService = new HighlightsService($pdo);
    }

    /**
     * Analyze interview and detect highlights
     * POST /api/highlights/analyze/{interviewId}
     */
    public function analyzeInterview($request, $interviewId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $options = [
                'max_highlights' => $data['max_highlights'] ?? 20,
                'min_confidence' => $data['min_confidence'] ?? 0.6,
                'highlight_types' => $data['highlight_types'] ?? null,
                'auto_approve' => $data['auto_approve'] ?? false
            ];
            
            $analysis = $this->highlightsService->analyzeInterview($interviewId, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'analysis' => $analysis,
                'message' => 'Interview analysis completed successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get highlights for an interview
     * GET /api/highlights/{interviewId}
     */
    public function getInterviewHighlights($request, $interviewId)
    {
        try {
            $options = [
                'type' => $_GET['type'] ?? null,
                'status' => $_GET['status'] ?? null,
                'min_confidence' => $_GET['min_confidence'] ?? null,
                'order_by' => $_GET['order_by'] ?? 'importance_score',
                'order_dir' => $_GET['order_dir'] ?? 'DESC',
                'limit' => $_GET['limit'] ?? null
            ];
            
            $highlights = $this->highlightsService->getInterviewHighlights($interviewId, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'highlights' => $highlights,
                'total' => count($highlights),
                'interview_id' => $interviewId
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update highlight status
     * PUT /api/highlights/{highlightId}/status
     */
    public function updateHighlightStatus($request, $highlightId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $status = $data['status'] ?? null;
            $userId = $data['user_id'] ?? 1; // Default user for demo
            
            if (!$status) {
                return $this->jsonResponse(['error' => 'Status is required'], 400);
            }
            
            $highlight = $this->highlightsService->updateHighlightStatus($highlightId, $status, $userId);
            
            return $this->jsonResponse([
                'success' => true,
                'highlight' => $highlight,
                'message' => 'Highlight status updated successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get highlight summary for an interview
     * GET /api/highlights/{interviewId}/summary
     */
    public function getHighlightSummary($request, $interviewId)
    {
        try {
            $summary = $this->highlightsService->generateHighlightSummary($interviewId);
            
            return $this->jsonResponse([
                'success' => true,
                'summary' => $summary,
                'interview_id' => $interviewId
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Search highlights
     * GET /api/highlights/search
     */
    public function searchHighlights($request)
    {
        try {
            $criteria = [
                'interview_id' => $_GET['interview_id'] ?? null,
                'keyword' => $_GET['keyword'] ?? null,
                'type' => $_GET['type'] ?? null,
                'date_from' => $_GET['date_from'] ?? null,
                'date_to' => $_GET['date_to'] ?? null,
                'limit' => $_GET['limit'] ?? 50
            ];
            
            $highlights = $this->highlightsService->searchHighlights($criteria);
            
            return $this->jsonResponse([
                'success' => true,
                'highlights' => $highlights,
                'total' => count($highlights),
                'criteria' => $criteria
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Submit highlight feedback
     * POST /api/highlights/{highlightId}/feedback
     */
    public function submitFeedback($request, $highlightId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $userId = $data['user_id'] ?? 1; // Default user for demo
            $feedback = [
                'feedback_type' => $data['feedback_type'] ?? 'quality',
                'rating' => $data['rating'] ?? null,
                'is_helpful' => $data['is_helpful'] ?? null,
                'comments' => $data['comments'] ?? null,
                'suggested_start_time' => $data['suggested_start_time'] ?? null,
                'suggested_end_time' => $data['suggested_end_time'] ?? null,
                'suggested_title' => $data['suggested_title'] ?? null
            ];
            
            $submittedFeedback = $this->highlightsService->submitFeedback($highlightId, $userId, $feedback);
            
            return $this->jsonResponse([
                'success' => true,
                'feedback' => $submittedFeedback,
                'message' => 'Feedback submitted successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get highlight types and statistics
     * GET /api/highlights/types
     */
    public function getHighlightTypes($request)
    {
        try {
            $types = $this->getHighlightTypesFromDB();
            
            return $this->jsonResponse([
                'success' => true,
                'types' => $types
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get highlight analytics
     * GET /api/highlights/analytics
     */
    public function getHighlightAnalytics($request)
    {
        try {
            $interviewId = $_GET['interview_id'] ?? null;
            $dateRange = $_GET['date_range'] ?? 30; // Last 30 days
            
            $analytics = $this->getAnalyticsFromDB($interviewId, $dateRange);
            
            return $this->jsonResponse([
                'success' => true,
                'analytics' => $analytics
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Export highlights
     * GET /api/highlights/{interviewId}/export
     */
    public function exportHighlights($request, $interviewId)
    {
        try {
            $format = $_GET['format'] ?? 'json';
            $includeTranscript = $_GET['include_transcript'] ?? true;
            $status = $_GET['status'] ?? null;
            
            $highlights = $this->highlightsService->getInterviewHighlights($interviewId, [
                'status' => $status
            ]);
            
            $exportData = $this->formatHighlightsForExport($highlights, $format, $includeTranscript);
            
            // Set appropriate headers
            $this->setExportHeaders($format, $interviewId);
            
            echo $exportData;
            exit;
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get processing queue status
     * GET /api/highlights/queue/{interviewId}
     */
    public function getProcessingQueue($request, $interviewId)
    {
        try {
            $queue = $this->getProcessingQueueFromDB($interviewId);
            
            return $this->jsonResponse([
                'success' => true,
                'queue' => $queue,
                'interview_id' => $interviewId
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk update highlights
     * PUT /api/highlights/bulk
     */
    public function bulkUpdateHighlights($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $highlightIds = $data['highlight_ids'] ?? [];
            $updates = $data['updates'] ?? [];
            $userId = $data['user_id'] ?? 1;
            
            if (empty($highlightIds) || empty($updates)) {
                return $this->jsonResponse(['error' => 'Highlight IDs and updates are required'], 400);
            }
            
            $results = [];
            foreach ($highlightIds as $highlightId) {
                if (isset($updates['status'])) {
                    $result = $this->highlightsService->updateHighlightStatus($highlightId, $updates['status'], $userId);
                    $results[] = $result;
                }
            }
            
            return $this->jsonResponse([
                'success' => true,
                'updated_highlights' => $results,
                'total_updated' => count($results),
                'message' => 'Bulk update completed successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get highlight types from database
     */
    private function getHighlightTypesFromDB(): array
    {
        $stmt = $this->highlightsService->pdo->prepare("
            SELECT
                highlight_type,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence,
                AVG(importance_score) as avg_importance
            FROM interview_highlights
            GROUP BY highlight_type
            ORDER BY count DESC
        ");
        $stmt->execute();
        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add type descriptions
        $typeDescriptions = [
            'breakthrough' => 'Significant discoveries or realizations',
            'insight' => 'Valuable perspectives and understanding',
            'emotional_peak' => 'Moments of high emotional engagement',
            'question_answer' => 'Important Q&A exchanges',
            'topic_change' => 'Introduction of new topics',
            'key_moment' => 'Other significant moments',
            'important_quote' => 'Notable quotes and statements',
            'conclusion' => 'Summary and concluding remarks'
        ];

        foreach ($types as &$type) {
            $type['description'] = $typeDescriptions[$type['highlight_type']] ?? 'Highlight type';
            $type['avg_confidence'] = round($type['avg_confidence'], 2);
            $type['avg_importance'] = round($type['avg_importance'], 2);
        }

        return $types;
    }

    /**
     * Get analytics from database
     */
    private function getAnalyticsFromDB(?string $interviewId, int $dateRange): array
    {
        $startDate = date('Y-m-d', strtotime("-{$dateRange} days"));

        // Basic statistics
        $sql = "
            SELECT
                COUNT(*) as total_highlights,
                AVG(confidence_score) as avg_confidence,
                AVG(importance_score) as avg_importance,
                AVG(engagement_score) as avg_engagement,
                SUM(duration) as total_duration
            FROM interview_highlights
            WHERE created_at >= ?
        ";
        $params = [$startDate];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $stmt = $this->highlightsService->pdo->prepare($sql);
        $stmt->execute($params);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Highlights by type
        $sql = "
            SELECT highlight_type, COUNT(*) as count
            FROM interview_highlights
            WHERE created_at >= ?
        ";
        $params = [$startDate];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $sql .= " GROUP BY highlight_type ORDER BY count DESC";

        $stmt = $this->highlightsService->pdo->prepare($sql);
        $stmt->execute($params);
        $byType = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Highlights by status
        $sql = "
            SELECT status, COUNT(*) as count
            FROM interview_highlights
            WHERE created_at >= ?
        ";
        $params = [$startDate];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $sql .= " GROUP BY status ORDER BY count DESC";

        $stmt = $this->highlightsService->pdo->prepare($sql);
        $stmt->execute($params);
        $byStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Daily highlights count
        $sql = "
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM interview_highlights
            WHERE created_at >= ?
        ";
        $params = [$startDate];

        if ($interviewId) {
            $sql .= " AND interview_id = ?";
            $params[] = $interviewId;
        }

        $sql .= " GROUP BY DATE(created_at) ORDER BY date ASC";

        $stmt = $this->highlightsService->pdo->prepare($sql);
        $stmt->execute($params);
        $daily = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'summary' => [
                'total_highlights' => (int)$stats['total_highlights'],
                'avg_confidence' => round($stats['avg_confidence'], 2),
                'avg_importance' => round($stats['avg_importance'], 2),
                'avg_engagement' => round($stats['avg_engagement'], 2),
                'total_duration' => round($stats['total_duration'], 1)
            ],
            'by_type' => $byType,
            'by_status' => $byStatus,
            'daily_counts' => $daily,
            'date_range' => $dateRange,
            'interview_id' => $interviewId
        ];
    }

    /**
     * Format highlights for export
     */
    private function formatHighlightsForExport(array $highlights, string $format, bool $includeTranscript): string
    {
        switch ($format) {
            case 'csv':
                return $this->formatHighlightsAsCSV($highlights, $includeTranscript);
            case 'xml':
                return $this->formatHighlightsAsXML($highlights, $includeTranscript);
            case 'srt':
                return $this->formatHighlightsAsSRT($highlights);
            case 'json':
            default:
                return $this->formatHighlightsAsJSON($highlights, $includeTranscript);
        }
    }

    /**
     * Format highlights as JSON
     */
    private function formatHighlightsAsJSON(array $highlights, bool $includeTranscript): string
    {
        $exportData = [
            'export_info' => [
                'generated_at' => date('Y-m-d H:i:s'),
                'total_highlights' => count($highlights),
                'include_transcript' => $includeTranscript
            ],
            'highlights' => $highlights
        ];

        if (!$includeTranscript) {
            foreach ($exportData['highlights'] as &$highlight) {
                unset($highlight['transcript_text']);
            }
        }

        return json_encode($exportData, JSON_PRETTY_PRINT);
    }

    /**
     * Format highlights as CSV
     */
    private function formatHighlightsAsCSV(array $highlights, bool $includeTranscript): string
    {
        $csv = "ID,Title,Type,Start Time,End Time,Duration,Confidence,Importance,Status,Speaker";

        if ($includeTranscript) {
            $csv .= ",Transcript";
        }

        $csv .= "\n";

        foreach ($highlights as $highlight) {
            $row = [
                $highlight['highlight_id'],
                '"' . str_replace('"', '""', $highlight['title']) . '"',
                $highlight['highlight_type'],
                $highlight['start_time'],
                $highlight['end_time'],
                $highlight['duration'],
                $highlight['confidence_score'],
                $highlight['importance_score'],
                $highlight['status'],
                $highlight['speaker_id'] ?? ''
            ];

            if ($includeTranscript) {
                $row[] = '"' . str_replace('"', '""', $highlight['transcript_text'] ?? '') . '"';
            }

            $csv .= implode(',', $row) . "\n";
        }

        return $csv;
    }

    /**
     * Format highlights as XML
     */
    private function formatHighlightsAsXML(array $highlights, bool $includeTranscript): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<highlights>' . "\n";
        $xml .= '  <export_info>' . "\n";
        $xml .= '    <generated_at>' . date('Y-m-d H:i:s') . '</generated_at>' . "\n";
        $xml .= '    <total_highlights>' . count($highlights) . '</total_highlights>' . "\n";
        $xml .= '  </export_info>' . "\n";

        foreach ($highlights as $highlight) {
            $xml .= '  <highlight>' . "\n";
            $xml .= '    <id>' . htmlspecialchars($highlight['highlight_id']) . '</id>' . "\n";
            $xml .= '    <title>' . htmlspecialchars($highlight['title']) . '</title>' . "\n";
            $xml .= '    <type>' . htmlspecialchars($highlight['highlight_type']) . '</type>' . "\n";
            $xml .= '    <start_time>' . $highlight['start_time'] . '</start_time>' . "\n";
            $xml .= '    <end_time>' . $highlight['end_time'] . '</end_time>' . "\n";
            $xml .= '    <duration>' . $highlight['duration'] . '</duration>' . "\n";
            $xml .= '    <confidence>' . $highlight['confidence_score'] . '</confidence>' . "\n";
            $xml .= '    <importance>' . $highlight['importance_score'] . '</importance>' . "\n";
            $xml .= '    <status>' . htmlspecialchars($highlight['status']) . '</status>' . "\n";

            if ($includeTranscript && !empty($highlight['transcript_text'])) {
                $xml .= '    <transcript>' . htmlspecialchars($highlight['transcript_text']) . '</transcript>' . "\n";
            }

            $xml .= '  </highlight>' . "\n";
        }

        $xml .= '</highlights>';

        return $xml;
    }

    /**
     * Format highlights as SRT subtitles
     */
    private function formatHighlightsAsSRT(array $highlights): string
    {
        $srt = '';
        $counter = 1;

        foreach ($highlights as $highlight) {
            $startTime = $this->formatSRTTime($highlight['start_time']);
            $endTime = $this->formatSRTTime($highlight['end_time']);

            $srt .= $counter . "\n";
            $srt .= $startTime . ' --> ' . $endTime . "\n";
            $srt .= $highlight['title'] . "\n";

            if (!empty($highlight['transcript_text'])) {
                $srt .= $highlight['transcript_text'] . "\n";
            }

            $srt .= "\n";
            $counter++;
        }

        return $srt;
    }

    /**
     * Format time for SRT
     */
    private function formatSRTTime(float $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        $milliseconds = ($secs - floor($secs)) * 1000;

        return sprintf('%02d:%02d:%02d,%03d', $hours, $minutes, floor($secs), $milliseconds);
    }

    /**
     * Set export headers
     */
    private function setExportHeaders(string $format, string $interviewId): void
    {
        $filename = "highlights_{$interviewId}_" . date('Y-m-d');

        switch ($format) {
            case 'csv':
                header('Content-Type: text/csv');
                header("Content-Disposition: attachment; filename=\"{$filename}.csv\"");
                break;
            case 'xml':
                header('Content-Type: application/xml');
                header("Content-Disposition: attachment; filename=\"{$filename}.xml\"");
                break;
            case 'srt':
                header('Content-Type: text/plain');
                header("Content-Disposition: attachment; filename=\"{$filename}.srt\"");
                break;
            case 'json':
            default:
                header('Content-Type: application/json');
                header("Content-Disposition: attachment; filename=\"{$filename}.json\"");
                break;
        }
    }

    /**
     * Get processing queue from database
     */
    private function getProcessingQueueFromDB(string $interviewId): array
    {
        $stmt = $this->highlightsService->pdo->prepare("
            SELECT * FROM highlight_processing_queue
            WHERE interview_id = ?
            ORDER BY priority DESC, created_at ASC
        ");
        $stmt->execute([$interviewId]);
        $queue = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($queue as &$item) {
            $item['result_data'] = json_decode($item['result_data'], true);
        }

        return $queue;
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
