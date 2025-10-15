<?php

namespace App\Controllers;

use App\Services\SocialMediaStreamingService;
use PDO;

/**
 * Social Media Streaming Controller
 * 
 * Handles REST API endpoints for social media streaming integration
 * including YouTube, Facebook, Twitch, LinkedIn, and Twitter/X.
 */
class SocialMediaStreamingController
{
    private SocialMediaStreamingService $socialMediaService;
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->socialMediaService = new SocialMediaStreamingService($pdo);
    }

    /**
     * GET /api/social-streaming/platforms
     * Get available social media platforms
     */
    public function getPlatforms(): array
    {
        try {
            return $this->socialMediaService->getAvailablePlatforms();
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get platforms: ' . $e->getMessage()
            ];
        }
    }

    /**
     * POST /api/social-streaming/oauth/start
     * Start OAuth flow for platform connection
     */
    public function startOAuth(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $input = $this->getJsonInput();

            if (!isset($input['platform_id'])) {
                throw new Exception('Platform ID is required');
            }

            $options = [
                'redirect_uri' => $input['redirect_uri'] ?? 'http://localhost:8000/oauth/callback',
                'scopes' => $input['scopes'] ?? null
            ];

            return $this->socialMediaService->startOAuthFlow(
                $userId,
                $input['platform_id'],
                $options
            );
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to start OAuth: ' . $e->getMessage()
            ];
        }
    }

    /**
     * POST /api/social-streaming/oauth/callback
     * Complete OAuth flow and create connection
     */
    public function completeOAuth(): array
    {
        try {
            $input = $this->getJsonInput();

            if (!isset($input['code']) || !isset($input['state'])) {
                throw new Exception('Authorization code and state are required');
            }

            $options = [
                'redirect_uri' => $input['redirect_uri'] ?? 'http://localhost:8000/oauth/callback'
            ];

            return $this->socialMediaService->completeOAuthFlow(
                $input['code'],
                $input['state'],
                $options
            );
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to complete OAuth: ' . $e->getMessage()
            ];
        }
    }

    /**
     * GET /api/social-streaming/connections
     * Get user's social media connections
     */
    public function getConnections(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            return $this->socialMediaService->getUserConnections($userId);
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get connections: ' . $e->getMessage()
            ];
        }
    }

    /**
     * DELETE /api/social-streaming/connections
     * Disconnect social media platform
     */
    public function disconnectPlatform(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $input = $this->getJsonInput();

            if (!isset($input['connection_id'])) {
                throw new Exception('Connection ID is required');
            }

            return $this->socialMediaService->disconnectPlatform(
                $input['connection_id'],
                $userId
            );
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to disconnect platform: ' . $e->getMessage()
            ];
        }
    }

    /**
     * POST /api/social-streaming/streams
     * Create multi-platform stream session
     */
    public function createStream(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $input = $this->getJsonInput();

            // Validate required fields
            if (!isset($input['title'])) {
                throw new Exception('Stream title is required');
            }

            $streamData = [
                'title' => $input['title'],
                'description' => $input['description'] ?? '',
                'category' => $input['category'] ?? 'interview',
                'tags' => $input['tags'] ?? [],
                'thumbnail_url' => $input['thumbnail_url'] ?? null,
                'scheduled_start_time' => $input['scheduled_start_time'] ?? null,
                'selected_platforms' => $input['selected_platforms'] ?? null,
                'chat_enabled' => $input['chat_enabled'] ?? true,
                'recording_enabled' => $input['recording_enabled'] ?? true,
                'auto_start' => $input['auto_start'] ?? false,
                'sync_settings' => $input['sync_settings'] ?? []
            ];

            return $this->socialMediaService->createMultiPlatformStream($userId, $streamData);
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * POST /api/social-streaming/streams/start
     * Start multi-platform streaming session
     */
    public function startStream(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $input = $this->getJsonInput();

            if (!isset($input['session_id'])) {
                throw new Exception('Session ID is required');
            }

            return $this->socialMediaService->startMultiPlatformStream(
                $input['session_id'],
                $userId
            );
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to start stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * POST /api/social-streaming/streams/stop
     * Stop multi-platform streaming session
     */
    public function stopStream(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $input = $this->getJsonInput();

            if (!isset($input['session_id'])) {
                throw new Exception('Session ID is required');
            }

            return $this->socialMediaService->stopMultiPlatformStream(
                $input['session_id'],
                $userId
            );
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to stop stream: ' . $e->getMessage()
            ];
        }
    }

    /**
     * GET /api/social-streaming/analytics
     * Get multi-platform stream analytics
     */
    public function getAnalytics(): array
    {
        try {
            $userId = $this->getCurrentUserId();
            $sessionId = $_GET['session_id'] ?? null;

            if (!$sessionId) {
                throw new Exception('Session ID is required');
            }

            return $this->socialMediaService->getMultiPlatformAnalytics($sessionId, $userId);
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * GET /api/social-streaming/demo-data
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        try {
            return $this->socialMediaService->getDemoData();
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get demo data: ' . $e->getMessage()
            ];
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get current user ID from JWT token
     */
    private function getCurrentUserId(): int
    {
        // In a real implementation, decode JWT token from Authorization header
        // For demo purposes, return a default user ID
        return 1;
    }

    /**
     * Get JSON input from request body
     */
    private function getJsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?: [];
    }

    /**
     * Send JSON response
     */
    private function sendJsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
