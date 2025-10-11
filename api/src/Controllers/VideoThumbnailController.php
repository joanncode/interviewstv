<?php

namespace App\Controllers;

use App\Services\VideoThumbnailService;
use App\Services\AuthService;

class VideoThumbnailController
{
    private $thumbnailService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->thumbnailService = new VideoThumbnailService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Generate poster thumbnail
     * POST /api/thumbnails/poster
     */
    public function generatePosterThumbnail()
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
            
            if (!isset($input['video_path']) || !isset($input['recording_id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path and recording ID are required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'];
            $options = $input['options'] ?? [];

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->thumbnailService->generatePosterThumbnail($videoPath, $recordingId, $options);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate timeline thumbnails
     * POST /api/thumbnails/timeline
     */
    public function generateTimelineThumbnails()
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
            
            if (!isset($input['video_path']) || !isset($input['recording_id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path and recording ID are required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'];
            $options = $input['options'] ?? [];

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->thumbnailService->generateTimelineThumbnails($videoPath, $recordingId, $options);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate animated preview
     * POST /api/thumbnails/preview
     */
    public function generateAnimatedPreview()
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
            
            if (!isset($input['video_path']) || !isset($input['recording_id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path and recording ID are required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'];
            $options = $input['options'] ?? [];

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->thumbnailService->generateAnimatedPreview($videoPath, $recordingId, $options);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate all thumbnail types
     * POST /api/thumbnails/generate-all
     */
    public function generateAllThumbnails()
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
            
            if (!isset($input['video_path']) || !isset($input['recording_id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path and recording ID are required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'];

            // Verify user owns the recording
            if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->thumbnailService->generateAllThumbnails($videoPath, $recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get thumbnails for a recording
     * GET /api/thumbnails/{recordingId}
     */
    public function getThumbnails($recordingId)
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

            $type = $_GET['type'] ?? null;
            $result = $this->thumbnailService->getThumbnails($recordingId, $type);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete thumbnails for a recording
     * DELETE /api/thumbnails/{recordingId}
     */
    public function deleteThumbnails($recordingId)
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
            $type = $input['type'] ?? null;

            $result = $this->thumbnailService->deleteThumbnails($recordingId, $type);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Serve thumbnail file
     * GET /api/thumbnails/{path}
     */
    public function serveThumbnail($path)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                http_response_code(401);
                echo 'Authentication required';
                exit;
            }

            $thumbnailPath = __DIR__ . '/../../storage/thumbnails/' . $path;
            
            if (!file_exists($thumbnailPath)) {
                http_response_code(404);
                echo 'Thumbnail not found';
                exit;
            }

            // Extract recording ID from path to verify ownership
            $pathParts = explode('/', $path);
            $recordingId = $pathParts[2] ?? null; // Assuming path structure: year/month/recordingId/file

            if ($recordingId && !$this->userOwnsRecording($user['id'], $recordingId)) {
                http_response_code(403);
                echo 'Access denied';
                exit;
            }

            // Serve the thumbnail
            $mimeType = mime_content_type($thumbnailPath);
            $fileSize = filesize($thumbnailPath);

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . $fileSize);
            header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

            readfile($thumbnailPath);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo 'Server error: ' . $e->getMessage();
            exit;
        }
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
