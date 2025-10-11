<?php

class VideoSharingService
{
    private $pdo;
    private $config;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new Database();
        $this->pdo = $database->getConnection();
        
        $this->config = [
            'base_url' => $_SERVER['HTTP_HOST'] ?? 'localhost',
            'share_url_base' => '/web/public/shared-video.html',
            'embed_url_base' => '/web/public/embed-video.html',
            'default_expiry_days' => 30,
            'max_expiry_days' => 365,
            'allowed_privacy_levels' => ['public', 'unlisted', 'private']
        ];
    }

    /**
     * Create a share link for a video recording
     */
    public function createShareLink(string $recordingId, int $userId, array $options = []): array
    {
        try {
            // Validate recording ownership
            if (!$this->userOwnsRecording($userId, $recordingId)) {
                throw new Exception('Access denied: User does not own this recording');
            }

            // Parse options
            $privacyLevel = $options['privacy'] ?? 'unlisted';
            $expiryDays = min($options['expiry_days'] ?? $this->config['default_expiry_days'], $this->config['max_expiry_days']);
            $password = $options['password'] ?? null;
            $allowDownload = $options['allow_download'] ?? false;
            $allowEmbedding = $options['allow_embedding'] ?? true;

            // Validate privacy level
            if (!in_array($privacyLevel, $this->config['allowed_privacy_levels'])) {
                throw new Exception('Invalid privacy level');
            }

            // Generate unique share token
            $shareToken = $this->generateShareToken();
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiryDays} days"));

            // Hash password if provided
            $passwordHash = $password ? password_hash($password, PASSWORD_DEFAULT) : null;

            // Insert share record
            $stmt = $this->pdo->prepare("
                INSERT INTO video_shares (
                    share_token, recording_id, user_id, privacy_level, 
                    expires_at, password_hash, allow_download, allow_embedding,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");

            $stmt->execute([
                $shareToken, $recordingId, $userId, $privacyLevel,
                $expiresAt, $passwordHash, $allowDownload ? 1 : 0, $allowEmbedding ? 1 : 0
            ]);

            $shareId = $this->pdo->lastInsertId();

            // Generate URLs
            $shareUrl = "https://{$this->config['base_url']}{$this->config['share_url_base']}?token={$shareToken}";
            $embedUrl = $allowEmbedding ? "https://{$this->config['base_url']}{$this->config['embed_url_base']}?token={$shareToken}" : null;

            // Log share creation
            $this->logShareActivity($shareId, 'created', $userId);

            return [
                'success' => true,
                'data' => [
                    'share_id' => $shareId,
                    'share_token' => $shareToken,
                    'share_url' => $shareUrl,
                    'embed_url' => $embedUrl,
                    'privacy_level' => $privacyLevel,
                    'expires_at' => $expiresAt,
                    'allow_download' => $allowDownload,
                    'allow_embedding' => $allowEmbedding,
                    'password_protected' => !empty($password),
                    'embed_code' => $allowEmbedding ? $this->generateEmbedCode($shareToken) : null
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
     * Get shared video by token
     */
    public function getSharedVideo(string $shareToken, string $password = null): array
    {
        try {
            // Get share record
            $stmt = $this->pdo->prepare("
                SELECT 
                    vs.*,
                    vf.recording_id,
                    vf.original_filename,
                    vf.storage_path,
                    vf.file_size,
                    vf.format,
                    vf.mime_type,
                    vf.duration,
                    vf.width,
                    vf.height,
                    vf.bitrate,
                    vf.thumbnail_path,
                    vf.created_at as video_created_at
                FROM video_shares vs
                JOIN video_files vf ON vs.recording_id = vf.recording_id
                WHERE vs.share_token = ? AND vs.is_active = 1
            ");
            $stmt->execute([$shareToken]);
            $share = $stmt->fetch();

            if (!$share) {
                throw new Exception('Share link not found or has been disabled');
            }

            // Check expiry
            if ($share['expires_at'] && strtotime($share['expires_at']) < time()) {
                throw new Exception('Share link has expired');
            }

            // Check password if required
            if ($share['password_hash']) {
                if (!$password) {
                    return [
                        'success' => false,
                        'requires_password' => true,
                        'message' => 'Password required to access this video'
                    ];
                }

                if (!password_verify($password, $share['password_hash'])) {
                    throw new Exception('Incorrect password');
                }
            }

            // Increment view count
            $this->incrementShareViews($share['id']);

            // Log access
            $this->logShareActivity($share['id'], 'accessed');

            // Generate streaming URL
            $streamUrl = $this->generateStreamUrl($share['storage_path']);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $share['recording_id'],
                    'title' => $share['original_filename'],
                    'duration' => $share['duration'],
                    'width' => $share['width'],
                    'height' => $share['height'],
                    'file_size' => $share['file_size'],
                    'format' => $share['format'],
                    'mime_type' => $share['mime_type'],
                    'stream_url' => $streamUrl,
                    'thumbnail_url' => $this->generateThumbnailUrl($share['thumbnail_path']),
                    'allow_download' => (bool)$share['allow_download'],
                    'allow_embedding' => (bool)$share['allow_embedding'],
                    'privacy_level' => $share['privacy_level'],
                    'created_at' => $share['video_created_at'],
                    'shared_at' => $share['created_at'],
                    'expires_at' => $share['expires_at']
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
     * Get user's share links
     */
    public function getUserShares(int $userId, int $page = 1, int $limit = 20): array
    {
        try {
            $offset = ($page - 1) * $limit;

            $stmt = $this->pdo->prepare("
                SELECT 
                    vs.*,
                    vf.original_filename,
                    vf.duration,
                    vf.file_size
                FROM video_shares vs
                JOIN video_files vf ON vs.recording_id = vf.recording_id
                WHERE vs.user_id = ?
                ORDER BY vs.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$userId, $limit, $offset]);
            $shares = $stmt->fetchAll();

            // Get total count
            $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM video_shares WHERE user_id = ?");
            $countStmt->execute([$userId]);
            $totalShares = $countStmt->fetchColumn();

            // Format shares
            $formattedShares = array_map(function($share) {
                return [
                    'share_id' => $share['id'],
                    'share_token' => $share['share_token'],
                    'recording_id' => $share['recording_id'],
                    'title' => $share['original_filename'],
                    'share_url' => "https://{$this->config['base_url']}{$this->config['share_url_base']}?token={$share['share_token']}",
                    'privacy_level' => $share['privacy_level'],
                    'views' => $share['view_count'],
                    'expires_at' => $share['expires_at'],
                    'is_active' => (bool)$share['is_active'],
                    'password_protected' => !empty($share['password_hash']),
                    'allow_download' => (bool)$share['allow_download'],
                    'allow_embedding' => (bool)$share['allow_embedding'],
                    'created_at' => $share['created_at'],
                    'duration' => $share['duration'],
                    'file_size' => $share['file_size']
                ];
            }, $shares);

            return [
                'success' => true,
                'data' => [
                    'shares' => $formattedShares,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => ceil($totalShares / $limit),
                        'total_shares' => $totalShares,
                        'per_page' => $limit
                    ]
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
     * Update share settings
     */
    public function updateShare(int $shareId, int $userId, array $updates): array
    {
        try {
            // Verify ownership
            $stmt = $this->pdo->prepare("SELECT id FROM video_shares WHERE id = ? AND user_id = ?");
            $stmt->execute([$shareId, $userId]);
            if (!$stmt->fetch()) {
                throw new Exception('Share not found or access denied');
            }

            $allowedFields = ['privacy_level', 'expires_at', 'allow_download', 'allow_embedding', 'is_active'];
            $updateFields = [];
            $updateValues = [];

            foreach ($updates as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $updateFields[] = "{$field} = ?";
                    $updateValues[] = $value;
                }
            }

            if (empty($updateFields)) {
                throw new Exception('No valid fields to update');
            }

            $updateValues[] = $shareId;
            $sql = "UPDATE video_shares SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($updateValues);

            // Log update
            $this->logShareActivity($shareId, 'updated', $userId);

            return [
                'success' => true,
                'message' => 'Share updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete/revoke share
     */
    public function revokeShare(int $shareId, int $userId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE video_shares 
                SET is_active = 0, revoked_at = NOW() 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$shareId, $userId]);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Share not found or access denied');
            }

            // Log revocation
            $this->logShareActivity($shareId, 'revoked', $userId);

            return [
                'success' => true,
                'message' => 'Share link revoked successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate embed code
     */
    public function generateEmbedCode(string $shareToken, array $options = []): string
    {
        $width = $options['width'] ?? 640;
        $height = $options['height'] ?? 360;
        $autoplay = $options['autoplay'] ?? false;
        $controls = $options['controls'] ?? true;

        $embedUrl = "https://{$this->config['base_url']}{$this->config['embed_url_base']}?token={$shareToken}";
        
        if ($autoplay) $embedUrl .= '&autoplay=1';
        if (!$controls) $embedUrl .= '&controls=0';

        return "<iframe src=\"{$embedUrl}\" width=\"{$width}\" height=\"{$height}\" frameborder=\"0\" allowfullscreen></iframe>";
    }

    /**
     * Get share analytics
     */
    public function getShareAnalytics(int $userId, string $period = '30d'): array
    {
        try {
            $dateCondition = $this->getDateCondition($period);

            // Total shares
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as total_shares,
                       SUM(view_count) as total_views,
                       AVG(view_count) as avg_views_per_share
                FROM video_shares 
                WHERE user_id = ? AND created_at >= {$dateCondition}
            ");
            $stmt->execute([$userId]);
            $totals = $stmt->fetch();

            // Shares by privacy level
            $stmt = $this->pdo->prepare("
                SELECT privacy_level, COUNT(*) as count
                FROM video_shares 
                WHERE user_id = ? AND created_at >= {$dateCondition}
                GROUP BY privacy_level
            ");
            $stmt->execute([$userId]);
            $byPrivacy = $stmt->fetchAll();

            // Daily views
            $stmt = $this->pdo->prepare("
                SELECT DATE(sal.created_at) as date, COUNT(*) as views
                FROM share_activity_log sal
                JOIN video_shares vs ON sal.share_id = vs.id
                WHERE vs.user_id = ? AND sal.activity_type = 'accessed' 
                AND sal.created_at >= {$dateCondition}
                GROUP BY DATE(sal.created_at)
                ORDER BY date DESC
            ");
            $stmt->execute([$userId]);
            $dailyViews = $stmt->fetchAll();

            return [
                'success' => true,
                'data' => [
                    'period' => $period,
                    'totals' => $totals,
                    'by_privacy' => $byPrivacy,
                    'daily_views' => $dailyViews
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    // Private helper methods
    private function generateShareToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function userOwnsRecording(int $userId, string $recordingId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT 1 FROM interview_recordings ir
            JOIN interview_rooms room ON ir.room_id = room.id
            WHERE ir.id = ? AND room.host_user_id = ?
        ");
        $stmt->execute([$recordingId, $userId]);
        return (bool)$stmt->fetch();
    }

    private function incrementShareViews(int $shareId): void
    {
        $stmt = $this->pdo->prepare("UPDATE video_shares SET view_count = view_count + 1 WHERE id = ?");
        $stmt->execute([$shareId]);
    }

    private function logShareActivity(int $shareId, string $activityType, int $userId = null): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO share_activity_log (share_id, activity_type, user_id, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $shareId,
            $activityType,
            $userId,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    }

    private function generateStreamUrl(string $storagePath): string
    {
        return "/api/videos/stream/" . base64_encode($storagePath);
    }

    private function generateThumbnailUrl(string $thumbnailPath): string
    {
        if (!$thumbnailPath) return null;
        return "/api/thumbnails/" . base64_encode($thumbnailPath);
    }

    private function getDateCondition(string $period): string
    {
        switch ($period) {
            case '7d':
                return "DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case '30d':
                return "DATE_SUB(NOW(), INTERVAL 30 DAY)";
            case '90d':
                return "DATE_SUB(NOW(), INTERVAL 90 DAY)";
            case '1y':
                return "DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            default:
                return "DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }
    }
}
