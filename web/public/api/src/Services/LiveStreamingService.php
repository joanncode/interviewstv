<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Live Streaming Service for Real-time Interview Broadcasting
 */
class LiveStreamingService
{
    private PDO $pdo;
    private array $config;
    private string $streamingServer;
    private string $rtmpEndpoint;
    private string $webrtcEndpoint;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'streaming_server' => 'rtmp://live.interviews.tv/live',
            'webrtc_server' => 'wss://webrtc.interviews.tv',
            'max_viewers' => 10000,
            'max_duration' => 14400, // 4 hours
            'recording_enabled' => true,
            'chat_enabled' => true,
            'moderation_enabled' => true,
            'quality_levels' => ['360p', '720p', '1080p'],
            'bitrate_limits' => [
                '360p' => 1000,
                '720p' => 2500,
                '1080p' => 5000
            ]
        ], $config);
        
        $this->streamingServer = $this->config['streaming_server'];
        $this->rtmpEndpoint = $this->config['streaming_server'];
        $this->webrtcEndpoint = $this->config['webrtc_server'];
    }

    /**
     * Create a new live stream
     */
    public function createStream(int $userId, array $streamData): array
    {
        try {
            // Validate user permissions
            if (!$this->canUserStream($userId)) {
                throw new Exception('User does not have streaming permissions');
            }

            // Generate unique stream key
            $streamKey = $this->generateStreamKey();
            $streamId = $this->generateStreamId();

            // Insert stream record
            $stmt = $this->pdo->prepare("
                INSERT INTO live_streams (
                    id, user_id, title, description, stream_key, 
                    status, scheduled_start, max_viewers, quality,
                    recording_enabled, chat_enabled, moderation_enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $streamId,
                $userId,
                $streamData['title'],
                $streamData['description'] ?? '',
                $streamKey,
                $streamData['scheduled_start'] ?? date('Y-m-d H:i:s'),
                $streamData['max_viewers'] ?? $this->config['max_viewers'],
                $streamData['quality'] ?? '720p',
                $streamData['recording_enabled'] ?? $this->config['recording_enabled'],
                $streamData['chat_enabled'] ?? $this->config['chat_enabled'],
                $streamData['moderation_enabled'] ?? $this->config['moderation_enabled']
            ]);

            // Create streaming endpoints
            $endpoints = $this->createStreamingEndpoints($streamId, $streamKey);

            // Setup recording if enabled
            if ($streamData['recording_enabled'] ?? true) {
                $this->setupRecording($streamId);
            }

            return [
                'stream_id' => $streamId,
                'stream_key' => $streamKey,
                'rtmp_url' => $endpoints['rtmp'],
                'webrtc_url' => $endpoints['webrtc'],
                'hls_url' => $endpoints['hls'],
                'dash_url' => $endpoints['dash'],
                'chat_room_id' => $this->createChatRoom($streamId),
                'status' => 'scheduled'
            ];

        } catch (Exception $e) {
            error_log("Failed to create stream: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Start a live stream
     */
    public function startStream(string $streamId, int $userId): array
    {
        try {
            // Verify stream ownership
            $stream = $this->getStreamById($streamId);
            if (!$stream || $stream['user_id'] !== $userId) {
                throw new Exception('Stream not found or access denied');
            }

            // Update stream status
            $stmt = $this->pdo->prepare("
                UPDATE live_streams 
                SET status = 'live', started_at = NOW(), updated_at = NOW()
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$streamId, $userId]);

            // Initialize streaming infrastructure
            $this->initializeStreamingInfrastructure($streamId);

            // Start recording if enabled
            if ($stream['recording_enabled']) {
                $this->startRecording($streamId);
            }

            // Notify subscribers
            $this->notifyStreamStart($streamId);

            return [
                'status' => 'live',
                'started_at' => date('Y-m-d H:i:s'),
                'viewer_count' => 0,
                'chat_active' => $stream['chat_enabled']
            ];

        } catch (Exception $e) {
            error_log("Failed to start stream: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Stop a live stream
     */
    public function stopStream(string $streamId, int $userId): array
    {
        try {
            $stream = $this->getStreamById($streamId);
            if (!$stream || $stream['user_id'] !== $userId) {
                throw new Exception('Stream not found or access denied');
            }

            // Calculate stream duration
            $duration = $this->calculateStreamDuration($stream['started_at']);

            // Update stream status
            $stmt = $this->pdo->prepare("
                UPDATE live_streams 
                SET status = 'ended', ended_at = NOW(), duration = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$duration, $streamId, $userId]);

            // Stop recording
            if ($stream['recording_enabled']) {
                $recordingUrl = $this->stopRecording($streamId);
            }

            // Cleanup streaming infrastructure
            $this->cleanupStreamingInfrastructure($streamId);

            // Generate stream analytics
            $analytics = $this->generateStreamAnalytics($streamId);

            // Notify subscribers of stream end
            $this->notifyStreamEnd($streamId);

            return [
                'status' => 'ended',
                'duration' => $duration,
                'recording_url' => $recordingUrl ?? null,
                'analytics' => $analytics
            ];

        } catch (Exception $e) {
            error_log("Failed to stop stream: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Join a live stream as viewer
     */
    public function joinStream(string $streamId, int $userId = null): array
    {
        try {
            $stream = $this->getStreamById($streamId);
            if (!$stream) {
                throw new Exception('Stream not found');
            }

            if ($stream['status'] !== 'live') {
                throw new Exception('Stream is not currently live');
            }

            // Check viewer limit
            $currentViewers = $this->getCurrentViewerCount($streamId);
            if ($currentViewers >= $stream['max_viewers']) {
                throw new Exception('Stream has reached maximum viewer capacity');
            }

            // Add viewer to stream
            $viewerId = $this->addViewer($streamId, $userId);

            // Get streaming URLs
            $streamingUrls = $this->getStreamingUrls($streamId);

            return [
                'viewer_id' => $viewerId,
                'stream_urls' => $streamingUrls,
                'chat_room_id' => $stream['chat_room_id'] ?? null,
                'current_viewers' => $currentViewers + 1,
                'stream_info' => [
                    'title' => $stream['title'],
                    'description' => $stream['description'],
                    'started_at' => $stream['started_at'],
                    'quality' => $stream['quality']
                ]
            ];

        } catch (Exception $e) {
            error_log("Failed to join stream: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Leave a live stream
     */
    public function leaveStream(string $streamId, string $viewerId): bool
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE stream_viewers 
                SET left_at = NOW(), duration = TIMESTAMPDIFF(SECOND, joined_at, NOW())
                WHERE id = ? AND stream_id = ? AND left_at IS NULL
            ");
            
            return $stmt->execute([$viewerId, $streamId]);

        } catch (Exception $e) {
            error_log("Failed to leave stream: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get live stream statistics
     */
    public function getStreamStats(string $streamId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    ls.*,
                    COUNT(DISTINCT sv.id) as total_viewers,
                    COUNT(DISTINCT CASE WHEN sv.left_at IS NULL THEN sv.id END) as current_viewers,
                    AVG(sv.duration) as avg_watch_time,
                    MAX(sv.duration) as max_watch_time,
                    COUNT(DISTINCT sc.id) as total_messages
                FROM live_streams ls
                LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id
                LEFT JOIN stream_chat sc ON ls.id = sc.stream_id
                WHERE ls.id = ?
                GROUP BY ls.id
            ");
            
            $stmt->execute([$streamId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$stats) {
                throw new Exception('Stream not found');
            }

            return [
                'stream_id' => $streamId,
                'status' => $stats['status'],
                'title' => $stats['title'],
                'started_at' => $stats['started_at'],
                'duration' => $stats['duration'],
                'total_viewers' => (int)$stats['total_viewers'],
                'current_viewers' => (int)$stats['current_viewers'],
                'avg_watch_time' => round($stats['avg_watch_time'] ?? 0, 2),
                'max_watch_time' => (int)($stats['max_watch_time'] ?? 0),
                'total_messages' => (int)$stats['total_messages'],
                'engagement_rate' => $this->calculateEngagementRate($streamId)
            ];

        } catch (Exception $e) {
            error_log("Failed to get stream stats: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get active live streams
     */
    public function getActiveStreams(int $limit = 20, int $offset = 0): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    ls.*,
                    u.name as streamer_name,
                    u.avatar as streamer_avatar,
                    COUNT(DISTINCT sv.id) as current_viewers
                FROM live_streams ls
                JOIN users u ON ls.user_id = u.id
                LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id AND sv.left_at IS NULL
                WHERE ls.status = 'live'
                GROUP BY ls.id
                ORDER BY current_viewers DESC, ls.started_at DESC
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$limit, $offset]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            error_log("Failed to get active streams: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Private helper methods
     */
    private function canUserStream(int $userId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT streaming_enabled, subscription_type 
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user && $user['streaming_enabled'] && 
               in_array($user['subscription_type'], ['creator', 'business', 'premium']);
    }

    private function generateStreamKey(): string
    {
        return 'sk_' . bin2hex(random_bytes(16));
    }

    private function generateStreamId(): string
    {
        return 'stream_' . bin2hex(random_bytes(8));
    }

    private function createStreamingEndpoints(string $streamId, string $streamKey): array
    {
        return [
            'rtmp' => $this->rtmpEndpoint . '/' . $streamKey,
            'webrtc' => $this->webrtcEndpoint . '/stream/' . $streamId,
            'hls' => "https://cdn.interviews.tv/hls/{$streamId}/playlist.m3u8",
            'dash' => "https://cdn.interviews.tv/dash/{$streamId}/manifest.mpd"
        ];
    }

    private function getStreamById(string $streamId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM live_streams WHERE id = ?");
        $stmt->execute([$streamId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getCurrentViewerCount(string $streamId): int
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM stream_viewers 
            WHERE stream_id = ? AND left_at IS NULL
        ");
        $stmt->execute([$streamId]);
        return (int)$stmt->fetchColumn();
    }

    private function addViewer(string $streamId, ?int $userId): string
    {
        $viewerId = 'viewer_' . bin2hex(random_bytes(8));
        
        $stmt = $this->pdo->prepare("
            INSERT INTO stream_viewers (id, stream_id, user_id, joined_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$viewerId, $streamId, $userId]);
        
        return $viewerId;
    }

    private function createChatRoom(string $streamId): string
    {
        $chatRoomId = 'chat_' . bin2hex(random_bytes(8));
        
        $stmt = $this->pdo->prepare("
            INSERT INTO chat_rooms (id, stream_id, created_at)
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([$chatRoomId, $streamId]);
        
        return $chatRoomId;
    }

    private function calculateStreamDuration(?string $startedAt): ?int
    {
        if (!$startedAt) return null;
        
        $start = new \DateTime($startedAt);
        $end = new \DateTime();
        return $end->getTimestamp() - $start->getTimestamp();
    }

    private function calculateEngagementRate(string $streamId): float
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(DISTINCT sv.id) as total_viewers,
                COUNT(DISTINCT sc.user_id) as chatting_viewers
            FROM stream_viewers sv
            LEFT JOIN stream_chat sc ON sv.stream_id = sc.stream_id AND sv.user_id = sc.user_id
            WHERE sv.stream_id = ?
        ");
        $stmt->execute([$streamId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data || $data['total_viewers'] == 0) return 0.0;
        
        return round(($data['chatting_viewers'] / $data['total_viewers']) * 100, 2);
    }

    // Placeholder methods for streaming infrastructure
    private function initializeStreamingInfrastructure(string $streamId): void
    {
        // Initialize streaming servers, CDN, etc.
    }

    private function cleanupStreamingInfrastructure(string $streamId): void
    {
        // Cleanup streaming resources
    }

    private function setupRecording(string $streamId): void
    {
        // Setup recording infrastructure
    }

    private function startRecording(string $streamId): void
    {
        // Start recording process
    }

    private function stopRecording(string $streamId): ?string
    {
        // Stop recording and return URL
        return null;
    }

    private function notifyStreamStart(string $streamId): void
    {
        // Send notifications to subscribers
    }

    private function notifyStreamEnd(string $streamId): void
    {
        // Send notifications about stream end
    }

    private function generateStreamAnalytics(string $streamId): array
    {
        // Generate detailed analytics
        return [];
    }

    private function getStreamingUrls(string $streamId): array
    {
        // Return streaming URLs for viewers
        return [];
    }
}
