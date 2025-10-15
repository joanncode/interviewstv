<?php

namespace App\Controllers;

use App\Services\AutomatedSummaryService;
use PDO;

/**
 * Automated Summary Controller
 * REST API endpoints for AI-powered interview summary generation
 */
class AutomatedSummaryController
{
    private AutomatedSummaryService $summaryService;
    private PDO $pdo;

    public function __construct()
    {
        // Database connection
        $dbPath = __DIR__ . '/../../interviews_tv.db';
        $this->pdo = new PDO("sqlite:$dbPath");
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Initialize service
        $this->summaryService = new AutomatedSummaryService($this->pdo);
    }

    /**
     * Start summary generation session
     * POST /api/automated-summaries/sessions
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
            
            $result = $this->summaryService->startSummarySession($interviewId, $userId, $options);
            
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
     * Generate interview summary
     * POST /api/automated-summaries/sessions/{sessionId}/generate
     */
    public function generateSummary($sessionId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
            }
            
            $interviewData = $input['interview_data'] ?? [];
            
            if (empty($interviewData)) {
                return $this->jsonResponse(['success' => false, 'error' => 'Interview data is required'], 400);
            }
            
            $result = $this->summaryService->generateSummary($sessionId, $interviewData);
            
            $statusCode = $result['success'] ? 200 : 400;
            return $this->jsonResponse($result, $statusCode);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to generate summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get session analytics
     * GET /api/automated-summaries/sessions/{sessionId}/analytics
     */
    public function getSessionAnalytics($sessionId)
    {
        try {
            $result = $this->summaryService->getSessionAnalytics($sessionId);
            
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
     * Get summary templates
     * GET /api/automated-summaries/templates
     */
    public function getSummaryTemplates()
    {
        try {
            $result = $this->summaryService->getSummaryTemplates();
            
            $statusCode = $result['success'] ? 200 : 500;
            return $this->jsonResponse($result, $statusCode);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get templates: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get summary by ID
     * GET /api/automated-summaries/summaries/{summaryId}
     */
    public function getSummary($summaryId)
    {
        try {
            $sql = "SELECT * FROM interview_summaries WHERE summary_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$summaryId]);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$summary) {
                return $this->jsonResponse([
                    'success' => false,
                    'error' => 'Summary not found'
                ], 404);
            }
            
            // Get sections
            $sql = "SELECT * FROM summary_sections WHERE summary_id = ? ORDER BY section_order";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$summaryId]);
            $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get insights
            $sql = "SELECT * FROM summary_insights WHERE summary_id = ? ORDER BY importance_score DESC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$summaryId]);
            $insights = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            $summary['key_points'] = json_decode($summary['key_points'], true);
            $summary['participant_insights'] = json_decode($summary['participant_insights'], true);
            $summary['strengths'] = json_decode($summary['strengths'], true);
            $summary['areas_for_improvement'] = json_decode($summary['areas_for_improvement'], true);
            $summary['recommendations'] = json_decode($summary['recommendations'], true);
            $summary['decision_factors'] = json_decode($summary['decision_factors'], true);
            $summary['summary_metadata'] = json_decode($summary['summary_metadata'], true);
            
            return $this->jsonResponse([
                'success' => true,
                'summary' => $summary,
                'sections' => $sections,
                'insights' => $insights
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get summaries for interview
     * GET /api/automated-summaries/interviews/{interviewId}/summaries
     */
    public function getInterviewSummaries($interviewId)
    {
        try {
            $sql = "SELECT summary_id, summary_type, title, overall_rating, confidence_score, 
                           word_count, reading_time_minutes, created_at 
                    FROM interview_summaries 
                    WHERE interview_id = ? 
                    ORDER BY created_at DESC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$interviewId]);
            $summaries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->jsonResponse([
                'success' => true,
                'interview_id' => $interviewId,
                'summaries' => $summaries,
                'total_count' => count($summaries)
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get interview summaries: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export summary
     * GET /api/automated-summaries/summaries/{summaryId}/export
     */
    public function exportSummary($summaryId)
    {
        try {
            $format = $_GET['format'] ?? 'json';
            $template = $_GET['template'] ?? 'default';
            
            // Get summary data
            $summaryResult = $this->getSummary($summaryId);
            $summaryData = json_decode($summaryResult, true);
            
            if (!$summaryData['success']) {
                return $this->jsonResponse(['success' => false, 'error' => 'Summary not found'], 404);
            }
            
            $summary = $summaryData['summary'];
            $sections = $summaryData['sections'];
            $insights = $summaryData['insights'];
            
            switch ($format) {
                case 'json':
                    return $this->exportAsJSON($summary, $sections, $insights);
                case 'html':
                    return $this->exportAsHTML($summary, $sections, $insights);
                case 'markdown':
                    return $this->exportAsMarkdown($summary, $sections, $insights);
                case 'csv':
                    return $this->exportAsCSV($summary, $sections, $insights);
                default:
                    return $this->jsonResponse(['success' => false, 'error' => 'Unsupported format'], 400);
            }
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to export summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit summary feedback
     * POST /api/automated-summaries/summaries/{summaryId}/feedback
     */
    public function submitFeedback($summaryId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
            }
            
            $feedbackId = 'feedback_' . uniqid() . '_' . time();
            
            $sql = "INSERT INTO summary_feedback (
                feedback_id, summary_id, user_id, rating, accuracy_rating, 
                completeness_rating, usefulness_rating, feedback_text, 
                suggested_improvements, would_recommend, feedback_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $feedbackId,
                $summaryId,
                $input['user_id'] ?? 1,
                $input['rating'] ?? 5,
                $input['accuracy_rating'] ?? 5,
                $input['completeness_rating'] ?? 5,
                $input['usefulness_rating'] ?? 5,
                $input['feedback_text'] ?? '',
                $input['suggested_improvements'] ?? '',
                $input['would_recommend'] ?? true,
                json_encode($input['metadata'] ?? [])
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
     * GET /api/automated-summaries/demo-data
     */
    public function getDemoData()
    {
        try {
            $result = $this->summaryService->getDemoData();
            return $this->jsonResponse($result);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get demo data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test summary generation with sample data
     * POST /api/automated-summaries/test
     */
    public function testSummaryGeneration()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $summaryType = $input['summary_type'] ?? 'comprehensive';
            
            // Create temporary session
            $sessionResult = $this->summaryService->startSummarySession(
                'test_interview_' . time(),
                1,
                ['type' => $summaryType, 'mode' => 'demo']
            );
            
            if (!$sessionResult['success']) {
                return $this->jsonResponse($sessionResult, 400);
            }
            
            $sessionId = $sessionResult['session']['session_id'];
            
            // Generate summary with demo data
            $demoData = $this->summaryService->getDemoData();
            $interviewData = $demoData['demo_interviews'][0];
            
            $result = $this->summaryService->generateSummary($sessionId, $interviewData);
            
            return $this->jsonResponse($result);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to test summary generation: ' . $e->getMessage()
            ], 500);
        }
    }

    // Export helper methods

    /**
     * Export as JSON
     */
    private function exportAsJSON(array $summary, array $sections, array $insights): string
    {
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="summary_' . $summary['summary_id'] . '.json"');

        $exportData = [
            'summary' => $summary,
            'sections' => $sections,
            'insights' => $insights,
            'exported_at' => date('Y-m-d H:i:s'),
            'export_format' => 'json'
        ];

        return json_encode($exportData, JSON_PRETTY_PRINT);
    }

    /**
     * Export as HTML
     */
    private function exportAsHTML(array $summary, array $sections, array $insights): string
    {
        header('Content-Type: text/html');
        header('Content-Disposition: attachment; filename="summary_' . $summary['summary_id'] . '.html"');

        $html = "<!DOCTYPE html>\n<html>\n<head>\n";
        $html .= "<title>" . htmlspecialchars($summary['title']) . "</title>\n";
        $html .= "<style>body{font-family:Arial,sans-serif;margin:40px;} .section{margin:20px 0;} .insight{margin:10px 0;padding:10px;background:#f5f5f5;}</style>\n";
        $html .= "</head>\n<body>\n";

        $html .= "<h1>" . htmlspecialchars($summary['title']) . "</h1>\n";
        $html .= "<p><strong>Overall Rating:</strong> " . $summary['overall_rating'] . "/10</p>\n";
        $html .= "<p><strong>Confidence Score:</strong> " . round($summary['confidence_score'] * 100) . "%</p>\n";

        if ($summary['executive_summary']) {
            $html .= "<div class='section'><h2>Executive Summary</h2>\n";
            $html .= "<p>" . nl2br(htmlspecialchars($summary['executive_summary'])) . "</p></div>\n";
        }

        foreach ($sections as $section) {
            $html .= "<div class='section'><h2>" . htmlspecialchars($section['section_title']) . "</h2>\n";
            $html .= "<p>" . nl2br(htmlspecialchars($section['section_content'])) . "</p></div>\n";
        }

        if (!empty($insights)) {
            $html .= "<div class='section'><h2>Key Insights</h2>\n";
            foreach ($insights as $insight) {
                $html .= "<div class='insight'>";
                $html .= "<strong>" . ucfirst($insight['insight_type']) . ":</strong> ";
                $html .= htmlspecialchars($insight['insight_text']);
                $html .= "</div>\n";
            }
            $html .= "</div>\n";
        }

        $html .= "<p><em>Generated on " . date('Y-m-d H:i:s') . "</em></p>\n";
        $html .= "</body>\n</html>";

        return $html;
    }

    /**
     * Export as Markdown
     */
    private function exportAsMarkdown(array $summary, array $sections, array $insights): string
    {
        header('Content-Type: text/markdown');
        header('Content-Disposition: attachment; filename="summary_' . $summary['summary_id'] . '.md"');

        $markdown = "# " . $summary['title'] . "\n\n";
        $markdown .= "**Overall Rating:** " . $summary['overall_rating'] . "/10\n";
        $markdown .= "**Confidence Score:** " . round($summary['confidence_score'] * 100) . "%\n\n";

        if ($summary['executive_summary']) {
            $markdown .= "## Executive Summary\n\n";
            $markdown .= $summary['executive_summary'] . "\n\n";
        }

        foreach ($sections as $section) {
            $markdown .= "## " . $section['section_title'] . "\n\n";
            $markdown .= $section['section_content'] . "\n\n";
        }

        if (!empty($insights)) {
            $markdown .= "## Key Insights\n\n";
            foreach ($insights as $insight) {
                $markdown .= "- **" . ucfirst($insight['insight_type']) . ":** ";
                $markdown .= $insight['insight_text'] . "\n";
            }
            $markdown .= "\n";
        }

        $markdown .= "*Generated on " . date('Y-m-d H:i:s') . "*\n";

        return $markdown;
    }

    /**
     * Export as CSV
     */
    private function exportAsCSV(array $summary, array $sections, array $insights): string
    {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="summary_' . $summary['summary_id'] . '.csv"');

        $csv = "Section,Content,Type,Confidence\n";

        // Add summary info
        $csv .= "\"Summary Info\",\"" . str_replace('"', '""', $summary['title']) . "\",\"title\",\"" . $summary['confidence_score'] . "\"\n";
        $csv .= "\"Overall Rating\",\"" . $summary['overall_rating'] . "/10\",\"rating\",\"1.0\"\n";

        // Add executive summary
        if ($summary['executive_summary']) {
            $csv .= "\"Executive Summary\",\"" . str_replace('"', '""', $summary['executive_summary']) . "\",\"summary\",\"" . $summary['confidence_score'] . "\"\n";
        }

        // Add sections
        foreach ($sections as $section) {
            $csv .= "\"" . str_replace('"', '""', $section['section_title']) . "\",";
            $csv .= "\"" . str_replace('"', '""', $section['section_content']) . "\",";
            $csv .= "\"section\",\"" . $section['confidence_score'] . "\"\n";
        }

        // Add insights
        foreach ($insights as $insight) {
            $csv .= "\"" . ucfirst($insight['insight_type']) . " Insight\",";
            $csv .= "\"" . str_replace('"', '""', $insight['insight_text']) . "\",";
            $csv .= "\"insight\",\"" . $insight['confidence_score'] . "\"\n";
        }

        return $csv;
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
