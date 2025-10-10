<?php

namespace App\Controllers;

use App\Services\LiveStreamingService;
use App\Services\ValidationService;
use App\Services\SecurityValidationService;
use App\Http\Request;
use App\Http\Response;
use PDO;
use Exception;

/**
 * Streaming Controller for Live Interview Broadcasting
 */
class StreamingController
{
    private LiveStreamingService $streamingService;
    private ValidationService $validator;
    private SecurityValidationService $securityValidator;
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->streamingService = new LiveStreamingService($pdo);
        $this->validator = new ValidationService();
        $this->securityValidator = new SecurityValidationService();
    }

    /**
     * Create a new live stream
     * POST /api/streams
     */
    public function createStream(Request $request): Response
    {
        try {
            // Get authenticated user
            $user = $request->user();
            if (!$user) {
                return Response::json(['error' => 'Authentication required'], 401);
            }

            // Validate input
            $data = $request->json();
            $validation = $this->validator->validate($data, [
                'title' => 'required|string|max:255',
                'description' => 'string|max:1000',
                'category' => 'string|in:interview,business,technology,arts,education,entertainment',
                'quality' => 'string|in:360p,720p,1080p',
                'max_viewers' => 'integer|min:1|max:10000',
                'recording_enabled' => 'boolean',
                'chat_enabled' => 'boolean',
                'scheduled_start' => 'date'
            ]);

            if (!$validation['valid']) {
                return Response::json(['error' => 'Validation failed', 'details' => $validation['errors']], 400);
            }

            // Security validation
            $securityCheck = $this->securityValidator->validateStreamCreation($user['id'], $data);
            if (!$securityCheck['valid']) {
                return Response::json(['error' => 'Security validation failed', 'details' => $securityCheck['errors']], 403);
            }

            // Create stream
            $streamData = [
                'title' => $data['title'],
                'description' => $data['description'] ?? '',
                'category' => $data['category'] ?? 'interview',
                'quality' => $data['quality'] ?? '720p',
                'max_viewers' => $data['max_viewers'] ?? 1000,
                'recording_enabled' => $data['recording_enabled'] ?? true,
                'chat_enabled' => $data['chat_enabled'] ?? true,
                'scheduled_start' => $data['scheduled_start'] ?? date('Y-m-d H:i:s')
            ];

            $stream = $this->streamingService->createStream($user['id'], $streamData);

            return Response::json([
                'success' => true,
                'data' => $stream,
                'message' => 'Stream created successfully'
            ], 201);

        } catch (Exception $e) {
            error_log("Stream creation error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to create stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start a live stream
     * POST /api/streams/{id}/start
     */
    public function startStream(Request $request, string $streamId): Response
    {
        try {
            $user = $request->user();
            if (!$user) {
                return Response::json(['error' => 'Authentication required'], 401);
            }

            $result = $this->streamingService->startStream($streamId, $user['id']);

            return Response::json([
                'success' => true,
                'data' => $result,
                'message' => 'Stream started successfully'
            ]);

        } catch (Exception $e) {
            error_log("Stream start error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to start stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stop a live stream
     * POST /api/streams/{id}/stop
     */
    public function stopStream(Request $request, string $streamId): Response
    {
        try {
            $user = $request->user();
            if (!$user) {
                return Response::json(['error' => 'Authentication required'], 401);
            }

            $result = $this->streamingService->stopStream($streamId, $user['id']);

            return Response::json([
                'success' => true,
                'data' => $result,
                'message' => 'Stream stopped successfully'
            ]);

        } catch (Exception $e) {
            error_log("Stream stop error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to stop stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get stream details
     * GET /api/streams/{id}
     */
    public function getStream(Request $request, string $streamId): Response
    {
        try {
            $stream = $this->streamingService->getStream($streamId);
            
            if (!$stream) {
                return Response::json(['error' => 'Stream not found'], 404);
            }

            return Response::json([
                'success' => true,
                'data' => $stream
            ]);

        } catch (Exception $e) {
            error_log("Get stream error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to get stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Join a stream as viewer
     * POST /api/streams/{id}/join
     */
    public function joinStream(Request $request, string $streamId): Response
    {
        try {
            $user = $request->user();
            $userId = $user ? $user['id'] : null;

            $result = $this->streamingService->joinStream($streamId, $userId);

            return Response::json([
                'success' => true,
                'data' => $result,
                'message' => 'Joined stream successfully'
            ]);

        } catch (Exception $e) {
            error_log("Join stream error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to join stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Leave a stream
     * POST /api/streams/{id}/leave
     */
    public function leaveStream(Request $request, string $streamId): Response
    {
        try {
            $data = $request->json();
            $viewerId = $data['viewer_id'] ?? null;

            if (!$viewerId) {
                return Response::json(['error' => 'Viewer ID required'], 400);
            }

            $result = $this->streamingService->leaveStream($streamId, $viewerId);

            return Response::json([
                'success' => true,
                'data' => ['left' => $result],
                'message' => 'Left stream successfully'
            ]);

        } catch (Exception $e) {
            error_log("Leave stream error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to leave stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get live streams
     * GET /api/streams/live
     */
    public function getLiveStreams(Request $request): Response
    {
        try {
            $page = (int)($request->query('page') ?? 1);
            $limit = (int)($request->query('limit') ?? 20);
            $category = $request->query('category');

            $streams = $this->streamingService->getLiveStreams($page, $limit, $category);

            return Response::json([
                'success' => true,
                'data' => $streams
            ]);

        } catch (Exception $e) {
            error_log("Get live streams error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to get live streams',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get stream statistics
     * GET /api/streams/{id}/stats
     */
    public function getStreamStats(Request $request, string $streamId): Response
    {
        try {
            $stats = $this->streamingService->getStreamStats($streamId);

            return Response::json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            error_log("Get stream stats error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to get stream statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update stream settings
     * PUT /api/streams/{id}
     */
    public function updateStream(Request $request, string $streamId): Response
    {
        try {
            $user = $request->user();
            if (!$user) {
                return Response::json(['error' => 'Authentication required'], 401);
            }

            $data = $request->json();
            $validation = $this->validator->validate($data, [
                'title' => 'string|max:255',
                'description' => 'string|max:1000',
                'category' => 'string|in:interview,business,technology,arts,education,entertainment',
                'quality' => 'string|in:360p,720p,1080p',
                'max_viewers' => 'integer|min:1|max:10000'
            ]);

            if (!$validation['valid']) {
                return Response::json(['error' => 'Validation failed', 'details' => $validation['errors']], 400);
            }

            $result = $this->streamingService->updateStream($streamId, $user['id'], $data);

            return Response::json([
                'success' => true,
                'data' => $result,
                'message' => 'Stream updated successfully'
            ]);

        } catch (Exception $e) {
            error_log("Update stream error: " . $e->getMessage());
            return Response::json([
                'error' => 'Failed to update stream',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
