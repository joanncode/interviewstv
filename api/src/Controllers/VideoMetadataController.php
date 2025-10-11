<?php

namespace App\Controllers;

use App\Services\VideoMetadataService;
use App\Services\AuthService;

class VideoMetadataController
{
    private $metadataService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->metadataService = new VideoMetadataService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Extract metadata from video file
     * POST /api/metadata/extract
     */
    public function extractMetadata()
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
            
            if (!isset($input['video_path'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path is required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'] ?? null;

            // Verify user has access to the video file
            if ($recordingId && !$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->metadataService->extractMetadata($videoPath, $recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get stored metadata for a recording
     * GET /api/metadata/{recordingId}
     */
    public function getStoredMetadata($recordingId)
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

            $result = $this->metadataService->getStoredMetadata($recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 404);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch extract metadata for multiple videos
     * POST /api/metadata/batch-extract
     */
    public function batchExtractMetadata()
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
            
            if (!isset($input['video_paths']) || !is_array($input['video_paths'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video paths array is required'
                ], 400);
            }

            $videoPaths = $input['video_paths'];

            // Verify user owns all recordings
            foreach ($videoPaths as $path => $recordingId) {
                if (!$this->userOwnsRecording($user['id'], $recordingId)) {
                    return $this->jsonResponse([
                        'success' => false,
                        'message' => 'Access denied to recording: ' . $recordingId
                    ], 403);
                }
            }

            $result = $this->metadataService->batchExtractMetadata($videoPaths);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assess video quality
     * POST /api/metadata/assess-quality
     */
    public function assessVideoQuality()
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
            
            if (!isset($input['video_path'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Video path is required'
                ], 400);
            }

            $videoPath = $input['video_path'];
            $recordingId = $input['recording_id'] ?? null;

            // Verify user has access to the video file
            if ($recordingId && !$this->userOwnsRecording($user['id'], $recordingId)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $result = $this->metadataService->assessVideoQuality($videoPath);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get metadata statistics for user's recordings
     * GET /api/metadata/stats
     */
    public function getMetadataStats()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Get statistics from database
            require_once __DIR__ . '/../config/database.php';
            $database = new \Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_videos,
                    COUNT(CASE WHEN metadata IS NOT NULL THEN 1 END) as videos_with_metadata,
                    AVG(duration) as avg_duration,
                    AVG(file_size) as avg_file_size,
                    COUNT(DISTINCT format) as unique_formats,
                    COUNT(CASE WHEN width >= 1920 THEN 1 END) as hd_videos,
                    COUNT(CASE WHEN width >= 1280 AND width < 1920 THEN 1 END) as hd_720_videos,
                    COUNT(CASE WHEN width < 1280 THEN 1 END) as sd_videos
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? AND vf.deleted_at IS NULL
            ");
            $stmt->execute([$user['id']]);
            $stats = $stmt->fetch();

            // Get format distribution
            $formatStmt = $pdo->prepare("
                SELECT format, COUNT(*) as count
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? AND vf.deleted_at IS NULL
                GROUP BY format
                ORDER BY count DESC
            ");
            $formatStmt->execute([$user['id']]);
            $formatDistribution = $formatStmt->fetchAll();

            // Get codec distribution
            $codecStmt = $pdo->prepare("
                SELECT codec, COUNT(*) as count
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? AND vf.deleted_at IS NULL AND codec IS NOT NULL
                GROUP BY codec
                ORDER BY count DESC
            ");
            $codecStmt->execute([$user['id']]);
            $codecDistribution = $codecStmt->fetchAll();

            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'overview' => [
                        'total_videos' => (int)$stats['total_videos'],
                        'videos_with_metadata' => (int)$stats['videos_with_metadata'],
                        'metadata_coverage' => $stats['total_videos'] > 0 ? 
                            round(($stats['videos_with_metadata'] / $stats['total_videos']) * 100, 1) : 0,
                        'avg_duration' => round((float)$stats['avg_duration'], 2),
                        'avg_file_size' => (int)$stats['avg_file_size'],
                        'unique_formats' => (int)$stats['unique_formats']
                    ],
                    'quality_distribution' => [
                        'hd_1080p_plus' => (int)$stats['hd_videos'],
                        'hd_720p' => (int)$stats['hd_720_videos'],
                        'sd_below_720p' => (int)$stats['sd_videos']
                    ],
                    'format_distribution' => $formatDistribution,
                    'codec_distribution' => $codecDistribution
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
     * Re-extract metadata for recordings missing it
     * POST /api/metadata/re-extract-missing
     */
    public function reExtractMissingMetadata()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Find recordings without metadata
            require_once __DIR__ . '/../config/database.php';
            $database = new \Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                SELECT vf.recording_id, vf.storage_path
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? 
                AND vf.deleted_at IS NULL 
                AND (vf.metadata IS NULL OR vf.processing_status != 'metadata_extracted')
            ");
            $stmt->execute([$user['id']]);
            $missingMetadata = $stmt->fetchAll();

            if (empty($missingMetadata)) {
                return $this->jsonResponse([
                    'success' => true,
                    'data' => [
                        'message' => 'All recordings already have metadata',
                        'processed' => 0
                    ]
                ]);
            }

            // Prepare video paths for batch extraction
            $videoPaths = [];
            foreach ($missingMetadata as $record) {
                $fullPath = __DIR__ . '/../../storage/' . $record['storage_path'];
                if (file_exists($fullPath)) {
                    $videoPaths[$fullPath] = $record['recording_id'];
                }
            }

            $result = $this->metadataService->batchExtractMetadata($videoPaths);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
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
