<?php

namespace App\Controllers;

use App\Services\RecordingService;
use App\Services\AuthService;

class RecordingController
{
    private $recordingService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->recordingService = new RecordingService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Start recording for a room
     * POST /api/recordings/start
     */
    public function startRecording()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['room_id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Room ID is required'
                ], 400);
            }

            $roomId = $input['room_id'];
            $options = $input['options'] ?? [];

            // Validate user has permission to record this room
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Check if user is host of the room
            if (!$this->isRoomHost($roomId, $user['id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Only room host can start recording'
                ], 403);
            }

            $result = $this->recordingService->startRecording($roomId, $options);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stop recording
     * POST /api/recordings/{recordingId}/stop
     */
    public function stopRecording($recordingId)
    {
        try {
            // Validate user has permission
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Check if user owns this recording
            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            $result = $this->recordingService->stopRecording($recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pause recording
     * POST /api/recordings/{recordingId}/pause
     */
    public function pauseRecording($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            $result = $this->recordingService->pauseRecording($recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resume recording
     * POST /api/recordings/{recordingId}/resume
     */
    public function resumeRecording($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            $result = $this->recordingService->resumeRecording($recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recording details
     * GET /api/recordings/{recordingId}
     */
    public function getRecording($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found'
                ], 404);
            }

            // Check access permissions
            if ($recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            return $this->jsonResponse([
                'success' => true,
                'data' => $recording
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recordings for a room
     * GET /api/rooms/{roomId}/recordings
     */
    public function getRoomRecordings($roomId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Check if user has access to this room
            if (!$this->isRoomHost($roomId, $user['id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            $recordings = $this->recordingService->getRoomRecordings($roomId);

            return $this->jsonResponse([
                'success' => true,
                'data' => $recordings
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's recordings
     * GET /api/recordings
     */
    public function getUserRecordings()
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

            $result = $this->recordingService->getUserRecordings($user['id'], $page, $limit);

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
     * Delete recording
     * DELETE /api/recordings/{recordingId}
     */
    public function deleteRecording($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            $result = $this->recordingService->deleteRecording($recordingId);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process recording chunks
     * POST /api/recordings/{recordingId}/process
     */
    public function processRecordingChunks($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            $result = $this->recordingService->processRecordingChunks($recordingId);

            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload recording chunk (for client-side recording)
     * POST /api/recordings/{recordingId}/upload
     */
    public function uploadRecordingChunk($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $recording = $this->recordingService->getRecordingById($recordingId);
            if (!$recording || $recording['host_user_id'] != $user['id']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Recording not found or access denied'
                ], 404);
            }

            if (!isset($_FILES['chunk'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'No file uploaded'
                ], 400);
            }

            $chunk = $_FILES['chunk'];
            $chunkIndex = (int)($_POST['chunk_index'] ?? 0);
            
            // Create chunks directory if it doesn't exist
            $chunksDir = dirname($recording['file_path']) . '/chunks/' . $recordingId;
            if (!is_dir($chunksDir)) {
                mkdir($chunksDir, 0755, true);
            }

            // Save chunk
            $chunkPath = $chunksDir . '/chunk_' . str_pad($chunkIndex, 6, '0', STR_PAD_LEFT) . '.webm';
            
            if (move_uploaded_file($chunk['tmp_name'], $chunkPath)) {
                return $this->jsonResponse([
                    'success' => true,
                    'data' => [
                        'chunk_index' => $chunkIndex,
                        'chunk_path' => $chunkPath,
                        'chunk_size' => filesize($chunkPath)
                    ]
                ]);
            } else {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Failed to save chunk'
                ], 500);
            }

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper methods
     */
    private function isRoomHost(string $roomId, int $userId): bool
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $stmt = $pdo->prepare("SELECT host_user_id FROM interview_rooms WHERE id = ?");
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();
        
        return $room && $room['host_user_id'] == $userId;
    }

    private function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
