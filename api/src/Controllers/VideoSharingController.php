<?php

require_once __DIR__ . '/../Services/VideoSharingService.php';
require_once __DIR__ . '/../Services/AuthService.php';

class VideoSharingController
{
    private $videoSharingService;
    private $authService;

    public function __construct()
    {
        $this->videoSharingService = new VideoSharingService();
        $this->authService = new AuthService();
    }

    /**
     * Create a share link for a video
     * POST /api/videos/{recordingId}/share
     */
    public function createShareLink($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Get request data
            $input = json_decode(file_get_contents('php://input'), true);
            
            $options = [
                'privacy' => $input['privacy'] ?? 'unlisted',
                'expiry_days' => $input['expiry_days'] ?? 30,
                'password' => $input['password'] ?? null,
                'allow_download' => $input['allow_download'] ?? false,
                'allow_embedding' => $input['allow_embedding'] ?? true
            ];

            $result = $this->videoSharingService->createShareLink($recordingId, $user['id'], $options);
            
            return $this->jsonResponse($result, $result['success'] ? 201 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get shared video by token
     * GET /api/videos/shared/{shareToken}
     */
    public function getSharedVideo($shareToken)
    {
        try {
            // Get password from request if provided
            $password = $_GET['password'] ?? $_POST['password'] ?? null;
            
            $result = $this->videoSharingService->getSharedVideo($shareToken, $password);
            
            $statusCode = 200;
            if (!$result['success']) {
                $statusCode = isset($result['requires_password']) ? 401 : 404;
            }
            
            return $this->jsonResponse($result, $statusCode);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's share links
     * GET /api/videos/shares
     */
    public function getUserShares()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));

            $result = $this->videoSharingService->getUserShares($user['id'], $page, $limit);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update share settings
     * PATCH /api/videos/shares/{shareId}
     */
    public function updateShare($shareId)
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
            
            $allowedUpdates = ['privacy_level', 'expires_at', 'allow_download', 'allow_embedding', 'is_active'];
            $updates = array_intersect_key($input, array_flip($allowedUpdates));

            if (empty($updates)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'No valid fields to update'
                ], 400);
            }

            $result = $this->videoSharingService->updateShare($shareId, $user['id'], $updates);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Revoke/delete share link
     * DELETE /api/videos/shares/{shareId}
     */
    public function revokeShare($shareId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->videoSharingService->revokeShare($shareId, $user['id']);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate embed code
     * GET /api/videos/{recordingId}/embed
     */
    public function getEmbedCode($recordingId)
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Get share token for this recording
            require_once __DIR__ . '/../config/database.php';
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                SELECT share_token, allow_embedding 
                FROM video_shares 
                WHERE recording_id = ? AND user_id = ? AND is_active = 1 
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$recordingId, $user['id']]);
            $share = $stmt->fetch();

            if (!$share) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'No active share found for this recording'
                ], 404);
            }

            if (!$share['allow_embedding']) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Embedding is not allowed for this share'
                ], 403);
            }

            // Get embed options from query parameters
            $options = [
                'width' => intval($_GET['width'] ?? 640),
                'height' => intval($_GET['height'] ?? 360),
                'autoplay' => filter_var($_GET['autoplay'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'controls' => filter_var($_GET['controls'] ?? true, FILTER_VALIDATE_BOOLEAN)
            ];

            $embedCode = $this->videoSharingService->generateEmbedCode($share['share_token'], $options);

            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'embed_code' => $embedCode,
                    'share_token' => $share['share_token'],
                    'options' => $options
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
     * Get share analytics
     * GET /api/videos/shares/analytics
     */
    public function getShareAnalytics()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $period = $_GET['period'] ?? '30d';
            $allowedPeriods = ['7d', '30d', '90d', '1y'];
            
            if (!in_array($period, $allowedPeriods)) {
                $period = '30d';
            }

            $result = $this->videoSharingService->getShareAnalytics($user['id'], $period);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Track social media share
     * POST /api/videos/shares/{shareId}/social
     */
    public function trackSocialShare($shareId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $platform = $input['platform'] ?? '';

            $allowedPlatforms = ['facebook', 'twitter', 'linkedin', 'reddit', 'email', 'copy_link'];
            
            if (!in_array($platform, $allowedPlatforms)) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Invalid platform'
                ], 400);
            }

            // Insert social share tracking
            require_once __DIR__ . '/../config/database.php';
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                INSERT INTO social_media_shares (share_id, platform, shared_at)
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$shareId, $platform]);

            return $this->jsonResponse([
                'success' => true,
                'message' => 'Social share tracked successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get social sharing URLs
     * GET /api/videos/shares/{shareId}/social-urls
     */
    public function getSocialSharingUrls($shareId)
    {
        try {
            // Get share info
            require_once __DIR__ . '/../config/database.php';
            $database = new Database();
            $pdo = $database->getConnection();

            $stmt = $pdo->prepare("
                SELECT vs.share_token, vf.original_filename
                FROM video_shares vs
                JOIN video_files vf ON vs.recording_id = vf.recording_id
                WHERE vs.id = ? AND vs.is_active = 1
            ");
            $stmt->execute([$shareId]);
            $share = $stmt->fetch();

            if (!$share) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Share not found'
                ], 404);
            }

            $shareUrl = "https://{$_SERVER['HTTP_HOST']}/web/public/shared-video.html?token={$share['share_token']}";
            $title = urlencode($share['original_filename'] . ' - Interviews.tv');
            $description = urlencode('Watch this interview recording on Interviews.tv');

            $socialUrls = [
                'facebook' => "https://www.facebook.com/sharer/sharer.php?u=" . urlencode($shareUrl),
                'twitter' => "https://twitter.com/intent/tweet?url=" . urlencode($shareUrl) . "&text=" . $title,
                'linkedin' => "https://www.linkedin.com/sharing/share-offsite/?url=" . urlencode($shareUrl),
                'reddit' => "https://reddit.com/submit?url=" . urlencode($shareUrl) . "&title=" . $title,
                'email' => "mailto:?subject=" . $title . "&body=" . $description . "%0A%0A" . urlencode($shareUrl),
                'copy_link' => $shareUrl
            ];

            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'share_url' => $shareUrl,
                    'social_urls' => $socialUrls,
                    'title' => $share['original_filename'],
                    'description' => 'Watch this interview recording on Interviews.tv'
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
