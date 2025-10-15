<?php

namespace App\Controllers;

use App\Services\CalendarIntegrationService;
use App\Core\Response;
use PDO;

/**
 * Calendar Integration Controller
 * Handles calendar integration API endpoints for Google Calendar, Outlook, and other providers
 */
class CalendarIntegrationController
{
    private CalendarIntegrationService $calendarService;
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->calendarService = new CalendarIntegrationService($pdo);
    }

    /**
     * Get available calendar providers
     * GET /api/calendar/providers
     */
    public function getProviders()
    {
        try {
            $result = $this->calendarService->getAvailableProviders();
            
            if ($result['success']) {
                return Response::success($result['providers'], 'Providers retrieved successfully');
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to get providers: ' . $e->getMessage());
        }
    }

    /**
     * Start OAuth flow for calendar provider
     * POST /api/calendar/oauth/start
     */
    public function startOAuth()
    {
        try {
            $userId = $this->getCurrentUserId();
            $providerId = $_POST['provider_id'] ?? '';
            $redirectUri = $_POST['redirect_uri'] ?? '';
            
            if (empty($providerId)) {
                return Response::error('Provider ID is required');
            }

            $options = [];
            if (!empty($redirectUri)) {
                $options['redirect_uri'] = $redirectUri;
            }

            $result = $this->calendarService->startOAuthFlow($userId, $providerId, $options);
            
            if ($result['success']) {
                return Response::success([
                    'auth_url' => $result['auth_url'],
                    'state' => $result['state'],
                    'provider' => $result['provider']
                ], 'OAuth flow started successfully');
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to start OAuth flow: ' . $e->getMessage());
        }
    }

    /**
     * Complete OAuth flow and create calendar connection
     * POST /api/calendar/oauth/callback
     */
    public function completeOAuth()
    {
        try {
            $code = $_POST['code'] ?? $_GET['code'] ?? '';
            $state = $_POST['state'] ?? $_GET['state'] ?? '';
            
            if (empty($code) || empty($state)) {
                return Response::error('Authorization code and state are required');
            }

            $options = [
                'is_primary' => $_POST['is_primary'] ?? false,
                'sync_enabled' => $_POST['sync_enabled'] ?? true,
                'sync_direction' => $_POST['sync_direction'] ?? 'bidirectional'
            ];

            $result = $this->calendarService->completeOAuthFlow($code, $state, $options);
            
            if ($result['success']) {
                return Response::success([
                    'connection_id' => $result['connection_id'],
                    'calendar_info' => $result['calendar_info']
                ], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to complete OAuth flow: ' . $e->getMessage());
        }
    }

    /**
     * Get user's calendar connections
     * GET /api/calendar/connections
     */
    public function getConnections()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            $result = $this->calendarService->getUserConnections($userId);
            
            if ($result['success']) {
                return Response::success($result['connections'], 'Connections retrieved successfully');
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to get connections: ' . $e->getMessage());
        }
    }

    /**
     * Sync calendar events for a connection
     * POST /api/calendar/connections/{connectionId}/sync
     */
    public function syncCalendar()
    {
        try {
            $connectionId = $_POST['connection_id'] ?? '';
            
            if (empty($connectionId)) {
                return Response::error('Connection ID is required');
            }

            $options = [
                'sync_type' => $_POST['sync_type'] ?? 'incremental',
                'start_date' => $_POST['start_date'] ?? null,
                'end_date' => $_POST['end_date'] ?? null
            ];

            $result = $this->calendarService->syncCalendarEvents($connectionId, $options);
            
            if ($result['success']) {
                return Response::success([
                    'operation_id' => $result['operation_id'],
                    'sync_results' => $result['sync_results']
                ], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to sync calendar: ' . $e->getMessage());
        }
    }

    /**
     * Create calendar event
     * POST /api/calendar/events
     */
    public function createEvent()
    {
        try {
            $connectionId = $_POST['connection_id'] ?? '';
            
            if (empty($connectionId)) {
                return Response::error('Connection ID is required');
            }

            $eventData = [
                'title' => $_POST['title'] ?? '',
                'description' => $_POST['description'] ?? '',
                'start_time' => $_POST['start_time'] ?? '',
                'end_time' => $_POST['end_time'] ?? '',
                'timezone' => $_POST['timezone'] ?? 'UTC',
                'location' => $_POST['location'] ?? '',
                'attendees' => json_decode($_POST['attendees'] ?? '[]', true),
                'reminders' => json_decode($_POST['reminders'] ?? '[]', true),
                'meeting_url' => $_POST['meeting_url'] ?? '',
                'interview_id' => $_POST['interview_id'] ?? null
            ];

            // Validate required fields
            if (empty($eventData['title']) || empty($eventData['start_time']) || empty($eventData['end_time'])) {
                return Response::error('Title, start time, and end time are required');
            }

            $result = $this->calendarService->createCalendarEvent($connectionId, $eventData);
            
            if ($result['success']) {
                return Response::success([
                    'event_id' => $result['event_id'],
                    'external_event_id' => $result['external_event_id'],
                    'event_data' => $result['event_data']
                ], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to create event: ' . $e->getMessage());
        }
    }

    /**
     * Update calendar event
     * PUT /api/calendar/events/{eventId}
     */
    public function updateEvent()
    {
        try {
            $eventId = $_POST['event_id'] ?? '';
            
            if (empty($eventId)) {
                return Response::error('Event ID is required');
            }

            $eventData = [
                'title' => $_POST['title'] ?? null,
                'description' => $_POST['description'] ?? null,
                'start_time' => $_POST['start_time'] ?? null,
                'end_time' => $_POST['end_time'] ?? null,
                'timezone' => $_POST['timezone'] ?? null,
                'location' => $_POST['location'] ?? null,
                'attendees' => isset($_POST['attendees']) ? json_decode($_POST['attendees'], true) : null,
                'reminders' => isset($_POST['reminders']) ? json_decode($_POST['reminders'], true) : null,
                'meeting_url' => $_POST['meeting_url'] ?? null
            ];

            // Remove null values
            $eventData = array_filter($eventData, function($value) {
                return $value !== null;
            });

            $result = $this->calendarService->updateCalendarEvent($eventId, $eventData);
            
            if ($result['success']) {
                return Response::success([
                    'event_id' => $result['event_id'],
                    'event_data' => $result['event_data']
                ], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to update event: ' . $e->getMessage());
        }
    }

    /**
     * Delete calendar event
     * DELETE /api/calendar/events/{eventId}
     */
    public function deleteEvent()
    {
        try {
            $eventId = $_POST['event_id'] ?? $_GET['event_id'] ?? '';
            
            if (empty($eventId)) {
                return Response::error('Event ID is required');
            }

            $result = $this->calendarService->deleteCalendarEvent($eventId);
            
            if ($result['success']) {
                return Response::success([], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete event: ' . $e->getMessage());
        }
    }

    /**
     * Get user availability
     * GET /api/calendar/availability
     */
    public function getAvailability()
    {
        try {
            $userId = $this->getCurrentUserId();
            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('+7 days'));
            $timezone = $_GET['timezone'] ?? 'UTC';

            $options = [
                'timezone' => $timezone,
                'include_working_hours' => $_GET['include_working_hours'] ?? true,
                'buffer_time' => $_GET['buffer_time'] ?? 15
            ];

            $result = $this->calendarService->getUserAvailability($userId, $startDate, $endDate, $options);
            
            if ($result['success']) {
                return Response::success([
                    'availability_id' => $result['availability_id'],
                    'busy_periods' => $result['busy_periods'],
                    'free_periods' => $result['free_periods'],
                    'timezone' => $result['timezone']
                ], 'Availability retrieved successfully');
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to get availability: ' . $e->getMessage());
        }
    }

    /**
     * Disconnect calendar
     * DELETE /api/calendar/connections/{connectionId}
     */
    public function disconnectCalendar()
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_POST['connection_id'] ?? $_GET['connection_id'] ?? '';
            
            if (empty($connectionId)) {
                return Response::error('Connection ID is required');
            }

            $result = $this->calendarService->disconnectCalendar($connectionId, $userId);
            
            if ($result['success']) {
                return Response::success([], $result['message']);
            } else {
                return Response::error($result['error']);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to disconnect calendar: ' . $e->getMessage());
        }
    }

    /**
     * Get calendar events for user
     * GET /api/calendar/events
     */
    public function getEvents()
    {
        try {
            $userId = $this->getCurrentUserId();

            $filters = [
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-1 month')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d', strtotime('+3 months')),
                'connection_ids' => isset($_GET['connection_ids']) ? explode(',', $_GET['connection_ids']) : [],
                'include_interviews' => $_GET['include_interviews'] ?? true
            ];

            $result = $this->calendarService->getCalendarEvents($userId, $filters);

            if ($result['success']) {
                return Response::success([
                    'events' => $result['events'],
                    'total_count' => $result['total_count']
                ], 'Events retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get events: ' . $e->getMessage());
        }
    }

    /**
     * Handle webhook notification
     * POST /api/calendar/webhooks/{providerId}
     */
    public function handleWebhook()
    {
        try {
            $providerId = $_GET['provider_id'] ?? '';

            if (empty($providerId)) {
                return Response::error('Provider ID is required');
            }

            // Get raw POST data
            $payload = json_decode(file_get_contents('php://input'), true);

            if (!$payload) {
                return Response::error('Invalid webhook payload');
            }

            $result = $this->calendarService->handleWebhookNotification($providerId, $payload);

            if ($result['success']) {
                return Response::success($result['processed'], $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to process webhook: ' . $e->getMessage());
        }
    }

    /**
     * Get calendar integration analytics
     * GET /api/calendar/analytics
     */
    public function getAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();

            $filters = [
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d'),
                'provider_id' => $_GET['provider_id'] ?? null
            ];

            $result = $this->calendarService->getIntegrationAnalytics($userId, $filters);

            if ($result['success']) {
                return Response::success([
                    'analytics' => $result['analytics'],
                    'summary' => $result['summary'],
                    'period' => $result['period']
                ], 'Analytics retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get analytics: ' . $e->getMessage());
        }
    }

    /**
     * Export calendar data
     * GET /api/calendar/export
     */
    public function exportCalendarData()
    {
        try {
            $userId = $this->getCurrentUserId();

            $options = [
                'format' => $_GET['format'] ?? 'ics',
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-1 month')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d', strtotime('+3 months')),
                'include_private' => $_GET['include_private'] ?? false
            ];

            $result = $this->calendarService->exportCalendarData($userId, $options);

            if ($result['success']) {
                // Set appropriate headers for file download
                header('Content-Type: ' . $result['mime_type']);
                header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
                header('Content-Length: ' . strlen($result['data']));

                echo $result['data'];
                exit;
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to export calendar data: ' . $e->getMessage());
        }
    }

    /**
     * Test calendar integration with demo data
     * POST /api/calendar/test
     */
    public function testIntegration()
    {
        try {
            $testType = $_POST['test_type'] ?? 'demo_data';

            switch ($testType) {
                case 'demo_data':
                    $result = $this->calendarService->getDemoData();
                    return Response::success($result, 'Demo data retrieved successfully');

                case 'connection_test':
                    $connectionId = $_POST['connection_id'] ?? '';
                    if (empty($connectionId)) {
                        return Response::error('Connection ID is required for connection test');
                    }

                    // Test connection by attempting a simple sync
                    $result = $this->calendarService->syncCalendarEvents($connectionId, ['sync_type' => 'test']);

                    if ($result['success']) {
                        return Response::success(['connection_status' => 'active'], 'Connection test successful');
                    } else {
                        return Response::error('Connection test failed: ' . $result['error']);
                    }

                default:
                    return Response::error('Invalid test type');
            }

        } catch (\Exception $e) {
            return Response::error('Failed to test integration: ' . $e->getMessage());
        }
    }

    /**
     * Get demo data for testing
     * GET /api/calendar/demo-data
     */
    public function getDemoData()
    {
        try {
            $result = $this->calendarService->getDemoData();
            return Response::success($result, 'Demo data retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to get demo data: ' . $e->getMessage());
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Get current user ID from session/token
     */
    private function getCurrentUserId(): int
    {
        // This should be implemented based on your authentication system
        // For now, returning a default user ID for testing
        return $_SESSION['user_id'] ?? 1;
    }

    /**
     * Require authentication
     */
    private function requireAuth(): void
    {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication required']);
            exit;
        }
    }

    /**
     * Validate required parameters
     */
    private function validateRequired(array $params, array $required): array
    {
        $missing = [];
        foreach ($required as $field) {
            if (!isset($params[$field]) || empty($params[$field])) {
                $missing[] = $field;
            }
        }
        return $missing;
    }
}
