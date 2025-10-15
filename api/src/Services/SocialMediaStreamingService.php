<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Social Media Streaming Service
 * 
 * Handles live streaming to multiple social media platforms including
 * YouTube, Facebook, Twitch, LinkedIn, and Twitter/X with comprehensive
 * multi-platform streaming, chat integration, and analytics.
 */
class SocialMediaStreamingService
{
    private PDO $pdo;
    private array $config;
    private array $platformClients;
    private string $encryptionKey;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'encryption_key' => 'your-encryption-key-here',
            'youtube_client_id' => '',
            'youtube_client_secret' => '',
            'facebook_app_id' => '',
            'facebook_app_secret' => '',
            'twitch_client_id' => '',
            'twitch_client_secret' => '',
            'linkedin_client_id' => '',
            'linkedin_client_secret' => '',
            'twitter_client_id' => '',
            'twitter_client_secret' => '',
            'default_stream_quality' => '720p',
            'default_bitrate' => 2500,
            'max_concurrent_platforms' => 5,
            'auto_start_delay' => 30,
            'chat_sync_enabled' => true,
            'analytics_enabled' => true
        ], $config);
        
        $this->encryptionKey = $this->config['encryption_key'];
        $this->platformClients = [];
    }

    /**
     * Get available social media platforms
     */
    public function getAvailablePlatforms(): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT platform_id, platform_name, platform_type, is_active,
                       supports_live_streaming, supports_chat, supports_analytics,
                       max_stream_duration, max_bitrate, supported_resolutions,
                       rate_limit_per_hour
                FROM social_media_platforms 
                WHERE is_active = 1 
                ORDER BY platform_name
            ");
            $stmt->execute();
            $platforms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($platforms as &$platform) {
                $platform['supported_resolutions'] = json_decode($platform['supported_resolutions'], true) ?: [];
                $platform['max_stream_duration_hours'] = round($platform['max_stream_duration'] / 3600, 1);
            }

            return [
                'success' => true,
                'data' => [
                    'platforms' => $platforms,
                    'total_platforms' => count($platforms),
                    'streaming_enabled' => array_filter($platforms, fn($p) => $p['supports_live_streaming']),
                    'chat_enabled' => array_filter($platforms, fn($p) => $p['supports_chat'])
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get platforms: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Start OAuth flow for platform connection
     */
    public function startOAuthFlow(int $userId, string $platformId, array $options = []): array
    {
        try {
            // Get platform configuration
            $platform = $this->getPlatformById($platformId);
            if (!$platform) {
                throw new Exception('Platform not found');
            }

            // Generate state for security
            $state = bin2hex(random_bytes(32));
            $redirectUri = $options['redirect_uri'] ?? 'http://localhost:8000/oauth/callback';

            // Store state in session/cache for verification
            $this->storeOAuthState($state, $userId, $platformId, $options);

            // Build OAuth URL based on platform
            $authUrl = $this->buildOAuthUrl($platform, $state, $redirectUri, $options);

            return [
                'success' => true,
                'data' => [
                    'auth_url' => $authUrl,
                    'state' => $state,
                    'platform_id' => $platformId,
                    'platform_name' => $platform['platform_name'],
                    'redirect_uri' => $redirectUri,
                    'expires_in' => 600 // 10 minutes
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to start OAuth flow: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Complete OAuth flow and create connection
     */
    public function completeOAuthFlow(string $code, string $state, array $options = []): array
    {
        try {
            // Verify state and get stored data
            $stateData = $this->getOAuthState($state);
            if (!$stateData) {
                throw new Exception('Invalid or expired state');
            }

            $userId = $stateData['user_id'];
            $platformId = $stateData['platform_id'];

            // Get platform configuration
            $platform = $this->getPlatformById($platformId);
            if (!$platform) {
                throw new Exception('Platform not found');
            }

            // Exchange code for tokens
            $tokenData = $this->exchangeCodeForTokens($platform, $code, $options);

            // Get user profile from platform
            $profileData = $this->getPlatformUserProfile($platform, $tokenData);

            // Create connection record
            $connectionId = $this->generateConnectionId();
            $this->createConnection($connectionId, $userId, $platformId, $tokenData, $profileData);

            // Clean up state
            $this->clearOAuthState($state);

            return [
                'success' => true,
                'data' => [
                    'connection_id' => $connectionId,
                    'platform_id' => $platformId,
                    'platform_name' => $platform['platform_name'],
                    'username' => $profileData['username'],
                    'display_name' => $profileData['display_name'],
                    'channel_name' => $profileData['channel_name'] ?? null,
                    'profile_url' => $profileData['profile_url'] ?? null,
                    'streaming_enabled' => true
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to complete OAuth: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user's social media connections
     */
    public function getUserConnections(int $userId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT c.connection_id, c.platform_id, c.username, c.display_name,
                       c.channel_name, c.channel_url, c.is_active, c.streaming_enabled,
                       c.total_streams, c.total_views, c.subscriber_count,
                       c.last_stream_at, c.created_at,
                       p.platform_name, p.platform_type, p.supports_live_streaming,
                       p.supports_chat, p.supports_analytics
                FROM user_social_media_connections c
                JOIN social_media_platforms p ON c.platform_id = p.platform_id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$userId]);
            $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add connection status and statistics
            foreach ($connections as &$connection) {
                $connection['status'] = $this->getConnectionStatus($connection['connection_id']);
                $connection['recent_streams'] = $this->getRecentStreams($connection['connection_id'], 5);
            }

            return [
                'success' => true,
                'data' => [
                    'connections' => $connections,
                    'total_connections' => count($connections),
                    'active_connections' => count(array_filter($connections, fn($c) => $c['is_active'])),
                    'streaming_enabled' => count(array_filter($connections, fn($c) => $c['streaming_enabled']))
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get connections: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create multi-platform stream session
     */
    public function createMultiPlatformStream(int $userId, array $streamData): array
    {
        try {
            // Validate user has active connections
            $connections = $this->getUserConnections($userId);
            if (!$connections['success'] || empty($connections['data']['connections'])) {
                throw new Exception('No social media connections found');
            }

            $activeConnections = array_filter(
                $connections['data']['connections'], 
                fn($c) => $c['is_active'] && $c['streaming_enabled']
            );

            if (empty($activeConnections)) {
                throw new Exception('No active streaming connections found');
            }

            // Generate session ID
            $sessionId = $this->generateSessionId();
            $localStreamId = $streamData['local_stream_id'] ?? $this->generateStreamId();

            // Create multi-platform stream session
            $stmt = $this->pdo->prepare("
                INSERT INTO multi_platform_streams (
                    session_id, user_id, local_stream_id, title, description,
                    category, tags, thumbnail_url, scheduled_start_time,
                    status, total_platforms, chat_enabled, recording_enabled,
                    auto_start, sync_settings, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $tags = json_encode($streamData['tags'] ?? []);
            $syncSettings = json_encode($streamData['sync_settings'] ?? []);
            $scheduledStart = $streamData['scheduled_start_time'] ?? date('Y-m-d H:i:s', strtotime('+5 minutes'));

            $stmt->execute([
                $sessionId,
                $userId,
                $localStreamId,
                $streamData['title'],
                $streamData['description'] ?? '',
                $streamData['category'] ?? 'interview',
                $tags,
                $streamData['thumbnail_url'] ?? null,
                $scheduledStart,
                count($activeConnections),
                $streamData['chat_enabled'] ?? true,
                $streamData['recording_enabled'] ?? true,
                $streamData['auto_start'] ?? false,
                $syncSettings
            ]);

            // Create individual platform streams
            $platformStreams = [];
            foreach ($activeConnections as $connection) {
                if (isset($streamData['selected_platforms']) && 
                    !in_array($connection['platform_id'], $streamData['selected_platforms'])) {
                    continue;
                }

                $platformStream = $this->createPlatformStream($connection, $streamData, $sessionId);
                if ($platformStream['success']) {
                    $platformStreams[] = $platformStream['data'];
                }
            }

            return [
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'local_stream_id' => $localStreamId,
                    'title' => $streamData['title'],
                    'scheduled_start_time' => $scheduledStart,
                    'total_platforms' => count($platformStreams),
                    'platform_streams' => $platformStreams,
                    'status' => 'scheduled'
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create multi-platform stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Start multi-platform streaming session
     */
    public function startMultiPlatformStream(string $sessionId, int $userId): array
    {
        try {
            // Get session data
            $session = $this->getMultiPlatformSession($sessionId, $userId);
            if (!$session) {
                throw new Exception('Stream session not found');
            }

            // Get platform stream mappings
            $mappings = $this->getPlatformStreamMappings($sessionId);
            if (empty($mappings)) {
                throw new Exception('No platform streams configured');
            }

            // Start streams on each platform
            $startedStreams = [];
            $failedStreams = [];

            foreach ($mappings as $mapping) {
                try {
                    $result = $this->startPlatformStream($mapping['stream_id'], $mapping['platform_id']);
                    if ($result['success']) {
                        $startedStreams[] = $mapping;
                        $this->updateMappingStatus($mapping['mapping_id'], 'active');
                    } else {
                        $failedStreams[] = array_merge($mapping, ['error' => $result['message']]);
                        $this->updateMappingStatus($mapping['mapping_id'], 'failed', $result['message']);
                    }
                } catch (Exception $e) {
                    $failedStreams[] = array_merge($mapping, ['error' => $e->getMessage()]);
                    $this->updateMappingStatus($mapping['mapping_id'], 'failed', $e->getMessage());
                }

                // Add delay between platform starts if configured
                if ($this->config['auto_start_delay'] > 0) {
                    sleep($this->config['auto_start_delay']);
                }
            }

            // Update session status
            $status = !empty($startedStreams) ? 'live' : 'failed';
            $this->updateMultiPlatformSessionStatus($sessionId, $status);

            return [
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'status' => $status,
                    'started_platforms' => count($startedStreams),
                    'failed_platforms' => count($failedStreams),
                    'started_streams' => $startedStreams,
                    'failed_streams' => $failedStreams,
                    'total_platforms' => count($mappings)
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to start multi-platform stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Stop multi-platform streaming session
     */
    public function stopMultiPlatformStream(string $sessionId, int $userId): array
    {
        try {
            // Get active platform streams
            $mappings = $this->getPlatformStreamMappings($sessionId, 'active');

            $stoppedStreams = [];
            $failedStops = [];

            foreach ($mappings as $mapping) {
                try {
                    $result = $this->stopPlatformStream($mapping['stream_id'], $mapping['platform_id']);
                    if ($result['success']) {
                        $stoppedStreams[] = $mapping;
                        $this->updateMappingStatus($mapping['mapping_id'], 'ended');
                    } else {
                        $failedStops[] = array_merge($mapping, ['error' => $result['message']]);
                    }
                } catch (Exception $e) {
                    $failedStops[] = array_merge($mapping, ['error' => $e->getMessage()]);
                }
            }

            // Update session status
            $this->updateMultiPlatformSessionStatus($sessionId, 'ended');

            return [
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'status' => 'ended',
                    'stopped_platforms' => count($stoppedStreams),
                    'failed_stops' => count($failedStops),
                    'stopped_streams' => $stoppedStreams,
                    'failed_stops' => $failedStops
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to stop multi-platform stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get multi-platform stream analytics
     */
    public function getMultiPlatformAnalytics(string $sessionId, int $userId): array
    {
        try {
            // Get session data
            $session = $this->getMultiPlatformSession($sessionId, $userId);
            if (!$session) {
                throw new Exception('Stream session not found');
            }

            // Get platform analytics
            $stmt = $this->pdo->prepare("
                SELECT sa.*, p.platform_name, s.title as stream_title
                FROM social_media_stream_analytics sa
                JOIN social_media_streams s ON sa.stream_id = s.stream_id
                JOIN social_media_platforms p ON sa.platform_id = p.platform_id
                JOIN platform_stream_mappings psm ON s.stream_id = psm.stream_id
                WHERE psm.session_id = ?
                ORDER BY sa.date_period DESC, p.platform_name
            ");
            $stmt->execute([$sessionId]);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Aggregate analytics across platforms
            $totalViews = 0;
            $totalUniqueViewers = 0;
            $totalWatchTime = 0;
            $totalChatMessages = 0;
            $totalEngagement = 0;
            $platformBreakdown = [];

            foreach ($analytics as $analytic) {
                $totalViews += $analytic['total_views'];
                $totalUniqueViewers += $analytic['unique_viewers'];
                $totalWatchTime += $analytic['total_watch_time'];
                $totalChatMessages += $analytic['chat_messages_count'];
                $totalEngagement += $analytic['likes_count'] + $analytic['shares_count'] + $analytic['comments_count'];

                $platformBreakdown[$analytic['platform_name']] = [
                    'views' => $analytic['total_views'],
                    'unique_viewers' => $analytic['unique_viewers'],
                    'watch_time' => $analytic['total_watch_time'],
                    'engagement' => $analytic['likes_count'] + $analytic['shares_count'] + $analytic['comments_count'],
                    'chat_messages' => $analytic['chat_messages_count']
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'session_id' => $sessionId,
                    'session_title' => $session['title'],
                    'total_views' => $totalViews,
                    'total_unique_viewers' => $totalUniqueViewers,
                    'total_watch_time_hours' => round($totalWatchTime / 3600, 2),
                    'total_chat_messages' => $totalChatMessages,
                    'total_engagement' => $totalEngagement,
                    'platform_breakdown' => $platformBreakdown,
                    'detailed_analytics' => $analytics,
                    'session_data' => $session
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Disconnect social media platform
     */
    public function disconnectPlatform(string $connectionId, int $userId): array
    {
        try {
            // Verify connection ownership
            $stmt = $this->pdo->prepare("
                SELECT connection_id, platform_id, username
                FROM user_social_media_connections
                WHERE connection_id = ? AND user_id = ?
            ");
            $stmt->execute([$connectionId, $userId]);
            $connection = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$connection) {
                throw new Exception('Connection not found');
            }

            // Stop any active streams
            $this->stopActiveStreamsForConnection($connectionId);

            // Delete connection
            $stmt = $this->pdo->prepare("
                DELETE FROM user_social_media_connections
                WHERE connection_id = ? AND user_id = ?
            ");
            $stmt->execute([$connectionId, $userId]);

            return [
                'success' => true,
                'data' => [
                    'connection_id' => $connectionId,
                    'platform_id' => $connection['platform_id'],
                    'username' => $connection['username'],
                    'message' => 'Platform disconnected successfully'
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to disconnect platform: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        try {
            return [
                'success' => true,
                'data' => [
                    'platforms' => [
                        [
                            'platform_id' => 'youtube',
                            'platform_name' => 'YouTube',
                            'platform_type' => 'youtube',
                            'supports_live_streaming' => true,
                            'supports_chat' => true,
                            'max_stream_duration' => 43200,
                            'max_bitrate' => 8000,
                            'supported_resolutions' => ['360p', '480p', '720p', '1080p', '1440p', '2160p']
                        ],
                        [
                            'platform_id' => 'facebook',
                            'platform_name' => 'Facebook',
                            'platform_type' => 'facebook',
                            'supports_live_streaming' => true,
                            'supports_chat' => true,
                            'max_stream_duration' => 14400,
                            'max_bitrate' => 6000,
                            'supported_resolutions' => ['360p', '480p', '720p', '1080p']
                        ],
                        [
                            'platform_id' => 'twitch',
                            'platform_name' => 'Twitch',
                            'platform_type' => 'twitch',
                            'supports_live_streaming' => true,
                            'supports_chat' => true,
                            'max_stream_duration' => 86400,
                            'max_bitrate' => 6000,
                            'supported_resolutions' => ['360p', '480p', '720p', '1080p']
                        ]
                    ],
                    'sample_connections' => [
                        [
                            'connection_id' => 'conn_youtube_demo',
                            'platform_id' => 'youtube',
                            'platform_name' => 'YouTube',
                            'username' => 'InterviewsTV',
                            'display_name' => 'Interviews.tv Official',
                            'channel_name' => 'Interviews.tv',
                            'subscriber_count' => 15420,
                            'total_streams' => 45,
                            'is_active' => true,
                            'streaming_enabled' => true
                        ],
                        [
                            'connection_id' => 'conn_facebook_demo',
                            'platform_id' => 'facebook',
                            'platform_name' => 'Facebook',
                            'username' => 'interviews.tv',
                            'display_name' => 'Interviews.tv',
                            'channel_name' => 'Interviews.tv Page',
                            'subscriber_count' => 8750,
                            'total_streams' => 28,
                            'is_active' => true,
                            'streaming_enabled' => true
                        ]
                    ],
                    'sample_streams' => [
                        [
                            'stream_id' => 'stream_demo_1',
                            'title' => 'Live Interview: Senior Developer Position',
                            'description' => 'Technical interview for senior software developer role',
                            'platform_id' => 'youtube',
                            'status' => 'live',
                            'viewer_count' => 127,
                            'like_count' => 23,
                            'comment_count' => 45,
                            'started_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
                        ],
                        [
                            'stream_id' => 'stream_demo_2',
                            'title' => 'Product Manager Interview Session',
                            'description' => 'Behavioral and case study interview',
                            'platform_id' => 'facebook',
                            'status' => 'scheduled',
                            'scheduled_start_time' => date('Y-m-d H:i:s', strtotime('+1 hour'))
                        ]
                    ],
                    'sample_analytics' => [
                        'total_views' => 2847,
                        'unique_viewers' => 1923,
                        'total_watch_time_hours' => 156.7,
                        'total_engagement' => 342,
                        'platform_breakdown' => [
                            'YouTube' => ['views' => 1654, 'engagement' => 198],
                            'Facebook' => ['views' => 1193, 'engagement' => 144]
                        ]
                    ]
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get demo data: ' . $e->getMessage()
            ];
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get platform by ID
     */
    private function getPlatformById(string $platformId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM social_media_platforms
            WHERE platform_id = ? AND is_active = 1
        ");
        $stmt->execute([$platformId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Generate unique connection ID
     */
    private function generateConnectionId(): string
    {
        return 'conn_' . bin2hex(random_bytes(16));
    }

    /**
     * Generate unique session ID
     */
    private function generateSessionId(): string
    {
        return 'session_' . bin2hex(random_bytes(16));
    }

    /**
     * Generate unique stream ID
     */
    private function generateStreamId(): string
    {
        return 'stream_' . bin2hex(random_bytes(16));
    }

    /**
     * Encrypt sensitive data
     */
    private function encrypt(string $data): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    private function decrypt(string $encryptedData): string
    {
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }

    /**
     * Store OAuth state for verification
     */
    private function storeOAuthState(string $state, int $userId, string $platformId, array $options): void
    {
        // In a real implementation, store in Redis or database with expiration
        // For demo purposes, we'll use a simple file-based approach
        $stateData = [
            'user_id' => $userId,
            'platform_id' => $platformId,
            'options' => $options,
            'expires_at' => time() + 600 // 10 minutes
        ];

        file_put_contents("/tmp/oauth_state_{$state}.json", json_encode($stateData));
    }

    /**
     * Get OAuth state data
     */
    private function getOAuthState(string $state): ?array
    {
        $file = "/tmp/oauth_state_{$state}.json";
        if (!file_exists($file)) {
            return null;
        }

        $data = json_decode(file_get_contents($file), true);
        if ($data['expires_at'] < time()) {
            unlink($file);
            return null;
        }

        return $data;
    }

    /**
     * Clear OAuth state
     */
    private function clearOAuthState(string $state): void
    {
        $file = "/tmp/oauth_state_{$state}.json";
        if (file_exists($file)) {
            unlink($file);
        }
    }
}
