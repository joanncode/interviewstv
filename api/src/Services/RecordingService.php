<?php

namespace App\Services;

use PDO;
use Exception;

class RecordingService
{
    private $pdo;
    private $config;
    private $ffmpegService;
    private $videoStorageService;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->config = [
            'recordings_path' => __DIR__ . '/../../recordings/',
            'max_recording_duration' => 7200, // 2 hours in seconds
            'supported_formats' => ['webm', 'mp4', 'mkv'],
            'default_quality' => '720p',
            'chunk_duration' => 300, // 5 minutes per chunk
            'auto_cleanup_days' => 30
        ];

        // Initialize FFmpeg service
        require_once __DIR__ . '/FFmpegRecordingService.php';
        $this->ffmpegService = new FFmpegRecordingService();

        // Initialize Video Storage service
        require_once __DIR__ . '/VideoStorageService.php';
        $this->videoStorageService = new VideoStorageService($pdo);

        // Ensure recordings directory exists
        if (!is_dir($this->config['recordings_path'])) {
            mkdir($this->config['recordings_path'], 0755, true);
        }
    }

    /**
     * Start a new recording session
     */
    public function startRecording(string $roomId, array $options = []): array
    {
        try {
            // Check if room exists and is active
            $room = $this->getRoomById($roomId);
            if (!$room) {
                throw new Exception('Room not found');
            }

            if ($room['status'] !== 'live' && $room['status'] !== 'waiting') {
                throw new Exception('Room is not active for recording');
            }

            // Check if recording is already in progress
            $existingRecording = $this->getActiveRecording($roomId);
            if ($existingRecording) {
                throw new Exception('Recording already in progress for this room');
            }

            // Generate recording metadata
            $recordingId = 'rec_' . bin2hex(random_bytes(16));
            $timestamp = date('Y-m-d_H-i-s');
            $filename = "interview_{$roomId}_{$timestamp}";
            $format = $options['format'] ?? 'webm';
            $quality = $options['quality'] ?? $this->config['default_quality'];

            // Create recording record
            $stmt = $this->pdo->prepare("
                INSERT INTO interview_recordings (
                    id, room_id, filename, file_path, format, quality, 
                    status, started_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'recording', NOW())
            ");

            $filePath = $this->config['recordings_path'] . $filename . '.' . $format;
            
            $stmt->execute([
                $recordingId,
                $roomId,
                $filename . '.' . $format,
                $filePath,
                $format,
                $quality
            ]);

            // Update room status to indicate recording
            $this->updateRoomRecordingStatus($roomId, true);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'filename' => $filename . '.' . $format,
                    'format' => $format,
                    'quality' => $quality,
                    'started_at' => date('Y-m-d H:i:s'),
                    'max_duration' => $this->config['max_recording_duration']
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Stop recording session
     */
    public function stopRecording(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            if ($recording['status'] !== 'recording') {
                throw new Exception('Recording is not active');
            }

            // Update recording status
            $stmt = $this->pdo->prepare("
                UPDATE interview_recordings 
                SET status = 'processing', completed_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$recordingId]);

            // Update room recording status
            $this->updateRoomRecordingStatus($recording['room_id'], false);

            // Calculate file size if file exists
            $fileSize = 0;
            if (file_exists($recording['file_path'])) {
                $fileSize = filesize($recording['file_path']);
                
                $stmt = $this->pdo->prepare("
                    UPDATE interview_recordings 
                    SET file_size = ? 
                    WHERE id = ?
                ");
                $stmt->execute([$fileSize, $recordingId]);
            }

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'status' => 'processing',
                    'file_size' => $fileSize,
                    'completed_at' => date('Y-m-d H:i:s')
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Pause recording session
     */
    public function pauseRecording(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            if ($recording['status'] !== 'recording') {
                throw new Exception('Recording is not active');
            }

            // For now, we'll treat pause as a marker - actual implementation would depend on recording method
            $stmt = $this->pdo->prepare("
                INSERT INTO room_settings (room_id, setting_key, setting_value)
                VALUES (?, 'recording_paused_at', ?)
                ON CONFLICT(room_id, setting_key) 
                DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
            ");
            
            $pausedAt = date('Y-m-d H:i:s');
            $stmt->execute([$recording['room_id'], $pausedAt, $pausedAt]);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'status' => 'paused',
                    'paused_at' => $pausedAt
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Resume recording session
     */
    public function resumeRecording(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            // Remove pause marker
            $stmt = $this->pdo->prepare("
                DELETE FROM room_settings 
                WHERE room_id = ? AND setting_key = 'recording_paused_at'
            ");
            $stmt->execute([$recording['room_id']]);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'status' => 'recording',
                    'resumed_at' => date('Y-m-d H:i:s')
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get recording by ID
     */
    public function getRecordingById(string $recordingId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*, ir.title as room_title, ir.host_user_id
            FROM interview_recordings r
            JOIN interview_rooms ir ON r.room_id = ir.id
            WHERE r.id = ?
        ");
        $stmt->execute([$recordingId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Get active recording for room
     */
    public function getActiveRecording(string $roomId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM interview_recordings 
            WHERE room_id = ? AND status = 'recording'
            ORDER BY started_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$roomId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Get all recordings for a room
     */
    public function getRoomRecordings(string $roomId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM interview_recordings 
            WHERE room_id = ? 
            ORDER BY started_at DESC
        ");
        $stmt->execute([$roomId]);
        return $stmt->fetchAll();
    }

    /**
     * Get recordings for a user
     */
    public function getUserRecordings(int $userId, int $page = 1, int $limit = 20): array
    {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->pdo->prepare("
            SELECT r.*, ir.title as room_title
            FROM interview_recordings r
            JOIN interview_rooms ir ON r.room_id = ir.id
            WHERE ir.host_user_id = ?
            ORDER BY r.started_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$userId, $limit, $offset]);
        $recordings = $stmt->fetchAll();

        // Get total count
        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*) as total
            FROM interview_recordings r
            JOIN interview_rooms ir ON r.room_id = ir.id
            WHERE ir.host_user_id = ?
        ");
        $countStmt->execute([$userId]);
        $total = $countStmt->fetch()['total'];

        return [
            'recordings' => $recordings,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ];
    }

    /**
     * Process recording chunks using FFmpeg
     */
    public function processRecordingChunks(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            // Update status to processing
            $stmt = $this->pdo->prepare("
                UPDATE interview_recordings
                SET status = 'processing', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([$recordingId]);

            // Check for chunks directory
            $chunksDir = dirname($recording['file_path']) . '/chunks/' . $recordingId;
            if (!is_dir($chunksDir)) {
                throw new Exception('No chunks directory found');
            }

            // Process chunks using FFmpeg
            $result = $this->ffmpegService->processRecordingChunks($recordingId, $chunksDir);

            if ($result['success']) {
                // Store video file in organized storage
                $storageResult = $this->videoStorageService->storeVideo(
                    $recordingId,
                    $result['data']['output_path'],
                    [
                        'chunks_processed' => $result['data']['chunks_processed'],
                        'processing_method' => 'ffmpeg_concat'
                    ]
                );

                if ($storageResult['success']) {
                    // Update recording with final file info
                    $stmt = $this->pdo->prepare("
                        UPDATE interview_recordings
                        SET
                            status = 'completed',
                            file_path = ?,
                            file_size = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $storageResult['data']['storage_path'],
                        $storageResult['data']['file_size'],
                        $recordingId
                    ]);

                    return [
                        'success' => true,
                        'data' => [
                            'recording_id' => $recordingId,
                            'status' => 'completed',
                            'file_path' => $storageResult['data']['storage_path'],
                            'file_size' => $storageResult['data']['file_size'],
                            'chunks_processed' => $result['data']['chunks_processed'],
                            'storage_url' => $storageResult['data']['url']
                        ]
                    ];
                } else {
                    throw new Exception('Failed to store video file: ' . $storageResult['message']);
                }
            } else {
                // Update status to failed
                $stmt = $this->pdo->prepare("
                    UPDATE interview_recordings
                    SET status = 'failed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmt->execute([$recordingId]);

                throw new Exception('FFmpeg processing failed: ' . $result['message']);
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Process recording (placeholder for post-processing)
     */
    public function processRecording(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            // Update status to processing
            $stmt = $this->pdo->prepare("
                UPDATE interview_recordings 
                SET status = 'processing' 
                WHERE id = ?
            ");
            $stmt->execute([$recordingId]);

            // Here you would implement actual processing:
            // - Video compression
            // - Thumbnail generation
            // - Format conversion
            // - Upload to cloud storage

            // For now, mark as completed
            $stmt = $this->pdo->prepare("
                UPDATE interview_recordings 
                SET status = 'completed' 
                WHERE id = ?
            ");
            $stmt->execute([$recordingId]);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'status' => 'completed'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete recording
     */
    public function deleteRecording(string $recordingId): array
    {
        try {
            $recording = $this->getRecordingById($recordingId);
            if (!$recording) {
                throw new Exception('Recording not found');
            }

            // Delete file if exists
            if (file_exists($recording['file_path'])) {
                unlink($recording['file_path']);
            }

            // Delete database record
            $stmt = $this->pdo->prepare("DELETE FROM interview_recordings WHERE id = ?");
            $stmt->execute([$recordingId]);

            return [
                'success' => true,
                'message' => 'Recording deleted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Helper methods
     */
    private function getRoomById(string $roomId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM interview_rooms WHERE id = ?");
        $stmt->execute([$roomId]);
        return $stmt->fetch() ?: null;
    }

    private function updateRoomRecordingStatus(string $roomId, bool $isRecording): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO room_settings (room_id, setting_key, setting_value)
            VALUES (?, 'is_recording', ?)
            ON CONFLICT(room_id, setting_key) 
            DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$roomId, $isRecording ? '1' : '0', $isRecording ? '1' : '0']);
    }
}
