<?php

namespace App\Controllers;

use App\Services\VideoCompressionService;
use App\Services\AuthService;

class VideoCompressionController
{
    private $compressionService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->compressionService = new VideoCompressionService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Compress a video file
     * POST /api/compression/compress
     */
    public function compressVideo()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['input_path']) || !isset($input['quality'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Input path and quality are required'
                ], 400);
            }

            $inputPath = $input['input_path'];
            $quality = $input['quality'];
            $format = $input['format'] ?? 'mp4';
            $options = $input['options'] ?? [];

            // Verify user has access to the input file
            if (!$this->userHasFileAccess($user['id'], $inputPath)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied to input file'
                ], 403);
            }

            $result = $this->compressionService->compressVideo($inputPath, $quality, $format, $options);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create multiple quality versions
     * POST /api/compression/multi-quality
     */
    public function createMultipleQualities()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['input_path'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Input path is required'
                ], 400);
            }

            $inputPath = $input['input_path'];
            $qualities = $input['qualities'] ?? ['360p', '720p'];
            $format = $input['format'] ?? 'mp4';

            // Verify user has access to the input file
            if (!$this->userHasFileAccess($user['id'], $inputPath)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied to input file'
                ], 403);
            }

            $result = $this->compressionService->createMultipleQualities($inputPath, $qualities, $format);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get compression job status
     * GET /api/compression/jobs/{jobId}
     */
    public function getJobStatus($jobId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->compressionService->getJobStatus($jobId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 404);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List compression jobs
     * GET /api/compression/jobs
     */
    public function listJobs()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $limit = (int)($_GET['limit'] ?? 20);
            $status = $_GET['status'] ?? null;

            $result = $this->compressionService->listJobs($limit, $status);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel compression job
     * POST /api/compression/jobs/{jobId}/cancel
     */
    public function cancelJob($jobId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->compressionService->cancelJob($jobId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available quality presets
     * GET /api/compression/presets
     */
    public function getQualityPresets()
    {
        try {
            $result = $this->compressionService->getQualityPresets();
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get supported formats
     * GET /api/compression/formats
     */
    public function getSupportedFormats()
    {
        try {
            $result = $this->compressionService->getSupportedFormats();
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cleanup old compression jobs
     * POST /api/compression/cleanup
     */
    public function cleanupOldJobs()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $daysOld = $input['days_old'] ?? 7;

            $result = $this->compressionService->cleanupOldJobs($daysOld);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has access to file
     */
    private function userHasFileAccess(int $userId, string $filePath): bool
    {
        // Extract recording ID from file path
        $pathParts = explode('/', $filePath);
        $filename = end($pathParts);
        $recordingId = pathinfo($filename, PATHINFO_FILENAME);

        // Check if user owns the recording
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $stmt = $pdo->prepare("
            SELECT ir.host_user_id 
            FROM interview_recordings ir 
            WHERE ir.id = ?
        ");
        $stmt->execute([$recordingId]);
        $recording = $stmt->fetch();
        
        return $recording && $recording['host_user_id'] == $userId;
    }

    /**
     * JSON response helper
     */
    private function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
