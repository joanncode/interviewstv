<?php

namespace App\Controllers;

use App\Services\VideoStorageService;
use App\Services\AuthService;

class VideoStorageController
{
    private $videoStorageService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->videoStorageService = new VideoStorageService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Store a video file
     * POST /api/videos/store
     */
    public function storeVideo()
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
            
            if (!isset($input['recording_id']) || !isset($input['source_path'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording ID and source path are required'
                ], 400);
            }

            $recordingId = $input['recording_id'];
            $sourcePath = $input['source_path'];
            $metadata = $input['metadata'] ?? [];

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->videoStorageService->storeVideo($recordingId, $sourcePath, $metadata);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get video file information
     * GET /api/videos/{recordingId}
     */
    public function getVideoFile($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $videoFile = $this->videoStorageService->getVideoFile($recordingId);
            
            if (!$videoFile) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video file not found'
                ], 404);
            }

            return $this->jsonResponse([
                'success' => true,
                'data' => $videoFile
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List video files
     * GET /api/videos
     */
    public function listVideoFiles()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 20);
            $filters = [
                'format' => $_GET['format'] ?? null,
                'date_from' => $_GET['date_from'] ?? null,
                'date_to' => $_GET['date_to'] ?? null
            ];

            $result = $this->videoStorageService->listVideoFiles($user['id'], $page, $limit, $filters);

            return $this->jsonResponse([
                'success' => true,
                'data' => $result
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete video file
     * DELETE /api/videos/{recordingId}
     */
    public function deleteVideoFile($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $hardDelete = $input['hard_delete'] ?? false;

            $result = $this->videoStorageService->deleteVideoFile($recordingId, $hardDelete);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get storage statistics
     * GET /api/videos/stats
     */
    public function getStorageStats()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $stats = $this->videoStorageService->getStorageStats($user['id']);

            return $this->jsonResponse([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stream video file
     * GET /api/videos/stream/{encodedPath}
     */
    public function streamVideo($encodedPath)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                http_response_code(401);
                echo 'Authentication required';
                exit;
            }

            $storagePath = base64_decode($encodedPath);
            $fullPath = __DIR__ . '/../../storage/' . $storagePath;

            if (!file_exists($fullPath)) {
                http_response_code(404);
                echo 'File not found';
                exit;
            }

            // Extract recording ID from path to verify ownership
            $pathParts = explode('/', $storagePath);
            $filename = end($pathParts);
            $recordingId = pathinfo($filename, PATHINFO_FILENAME);

            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                http_response_code(403);
                echo 'Access denied';
                exit;
            }

            // Serve the video file with proper headers
            $this->serveVideoFile($fullPath);

        } catch (Exception $e) {
            http_response_code(500);
            echo 'Server error: ' . $e->getMessage();
            exit;
        }
    }

    /**
     * Serve video file with range support
     */
    private function serveVideoFile($filePath)
    {
        $fileSize = filesize($filePath);
        $mimeType = mime_content_type($filePath);
        
        // Set headers
        header('Content-Type: ' . $mimeType);
        header('Accept-Ranges: bytes');
        header('Content-Length: ' . $fileSize);
        
        // Handle range requests for video streaming
        if (isset($_SERVER['HTTP_RANGE'])) {
            $range = $_SERVER['HTTP_RANGE'];
            $ranges = explode('=', $range);
            $offsets = explode('-', $ranges[1]);
            
            $offset = intval($offsets[0]);
            $length = intval($offsets[1]) ?: $fileSize - 1;
            
            if ($offset > 0 || $length < $fileSize - 1) {
                header('HTTP/1.1 206 Partial Content');
                header('Content-Range: bytes ' . $offset . '-' . $length . '/' . $fileSize);
                header('Content-Length: ' . ($length - $offset + 1));
                
                $file = fopen($filePath, 'rb');
                fseek($file, $offset);
                echo fread($file, $length - $offset + 1);
                fclose($file);
                exit;
            }
        }
        
        // Serve full file
        readfile($filePath);
        exit;
    }

    /**
     * Check if user owns the recording
     */
    private function userOwnsRecording(int $userId, string $recordingId): bool
    {
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
     * Get available video qualities for a recording
     * GET /api/videos/{recordingId}/qualities
     */
    public function getVideoQualities($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            // Get video file info
            $videoFile = $this->videoStorageService->getVideoFile($recordingId);
            if (!$videoFile) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video file not found'
                ], 404);
            }

            // Check for compressed versions
            require_once __DIR__ . '/../config/database.php';
            $database = new \Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                SELECT
                    vpq.processing_params,
                    vpq.output_path,
                    vpq.status
                FROM video_processing_queue vpq
                WHERE vpq.recording_id = ?
                AND vpq.processing_type = 'compression'
                AND vpq.status = 'completed'
                ORDER BY vpq.created_at DESC
            ");
            $stmt->execute([$recordingId]);
            $compressedVersions = $stmt->fetchAll();

            // Build qualities array
            $qualities = [];

            // Original quality
            $originalQuality = $this->determineQualityFromResolution($videoFile['width'], $videoFile['height']);
            $qualities[] = [
                'quality' => $originalQuality,
                'label' => $originalQuality . ' (Original)',
                'width' => $videoFile['width'],
                'height' => $videoFile['height'],
                'bitrate' => $videoFile['bitrate'] ?? $this->estimateBitrate($originalQuality),
                'file_size' => $videoFile['file_size'],
                'src' => $this->videoStorageService->generateFileUrl($videoFile['storage_path']),
                'type' => $videoFile['mime_type']
            ];

            // Compressed versions
            foreach ($compressedVersions as $version) {
                $params = json_decode($version['processing_params'], true);
                if (isset($params['quality']) && file_exists($version['output_path'])) {
                    $qualities[] = [
                        'quality' => $params['quality'],
                        'label' => $params['quality'],
                        'width' => $this->getQualityWidth($params['quality']),
                        'height' => $this->getQualityHeight($params['quality']),
                        'bitrate' => $this->estimateBitrate($params['quality']),
                        'file_size' => filesize($version['output_path']),
                        'src' => '/api/videos/stream/' . base64_encode(str_replace(__DIR__ . '/../../storage/', '', $version['output_path'])),
                        'type' => 'video/mp4'
                    ];
                }
            }

            // Sort by quality (highest first)
            usort($qualities, function($a, $b) {
                return $this->getQualityOrder($b['quality']) - $this->getQualityOrder($a['quality']);
            });

            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'qualities' => $qualities,
                    'default_quality' => $originalQuality,
                    'auto_quality_available' => count($qualities) > 1
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper methods for quality determination
     */
    private function determineQualityFromResolution($width, $height)
    {
        if ($height >= 2160) return '2160p';
        if ($height >= 1440) return '1440p';
        if ($height >= 1080) return '1080p';
        if ($height >= 720) return '720p';
        if ($height >= 480) return '480p';
        if ($height >= 360) return '360p';
        return '240p';
    }

    private function getQualityWidth($quality)
    {
        $dimensions = [
            '240p' => 426, '360p' => 640, '480p' => 854,
            '720p' => 1280, '1080p' => 1920, '1440p' => 2560, '2160p' => 3840
        ];
        return $dimensions[$quality] ?? 640;
    }

    private function getQualityHeight($quality)
    {
        $dimensions = [
            '240p' => 240, '360p' => 360, '480p' => 480,
            '720p' => 720, '1080p' => 1080, '1440p' => 1440, '2160p' => 2160
        ];
        return $dimensions[$quality] ?? 360;
    }

    private function estimateBitrate($quality)
    {
        $bitrates = [
            '240p' => 400000, '360p' => 800000, '480p' => 1200000,
            '720p' => 2500000, '1080p' => 5000000, '1440p' => 8000000, '2160p' => 16000000
        ];
        return $bitrates[$quality] ?? 800000;
    }

    private function getQualityOrder($quality)
    {
        $order = [
            '240p' => 1, '360p' => 2, '480p' => 3,
            '720p' => 4, '1080p' => 5, '1440p' => 6, '2160p' => 7
        ];
        return $order[$quality] ?? 0;
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
