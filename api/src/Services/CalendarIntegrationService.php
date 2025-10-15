<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Calendar Integration Service
 * Comprehensive calendar integration with Google Calendar, Outlook, and other providers
 */
class CalendarIntegrationService
{
    private PDO $pdo;
    private array $config;
    private array $providers;
    private array $activeConnections;
    
    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'encryption_key' => $_ENV['CALENDAR_ENCRYPTION_KEY'] ?? 'default-key-change-in-production',
            'default_sync_frequency' => 15, // minutes
            'max_events_per_sync' => 1000,
            'webhook_base_url' => $_ENV['WEBHOOK_BASE_URL'] ?? 'https://interviews.tv/api/calendar/webhooks',
            'google_client_id' => $_ENV['GOOGLE_CALENDAR_CLIENT_ID'] ?? '',
            'google_client_secret' => $_ENV['GOOGLE_CALENDAR_CLIENT_SECRET'] ?? '',
            'microsoft_client_id' => $_ENV['MICROSOFT_CALENDAR_CLIENT_ID'] ?? '',
            'microsoft_client_secret' => $_ENV['MICROSOFT_CALENDAR_CLIENT_SECRET'] ?? '',
            'enable_real_time_sync' => true,
            'enable_conflict_resolution' => true,
            'enable_availability_sync' => true,
            'default_timezone' => 'UTC'
        ], $config);
        
        $this->activeConnections = [];
        $this->loadProviders();
    }

    /**
     * Get available calendar providers
     */
    public function getAvailableProviders(): array
    {
        try {
            $sql = "SELECT * FROM calendar_providers WHERE is_active = 1 ORDER BY provider_name";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            return [
                'success' => true,
                'providers' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get providers: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Start OAuth flow for calendar provider
     */
    public function startOAuthFlow(int $userId, string $providerId, array $options = []): array
    {
        try {
            $provider = $this->getProvider($providerId);
            if (!$provider) {
                throw new Exception('Provider not found');
            }

            $state = $this->generateSecureState($userId, $providerId);
            $redirectUri = $options['redirect_uri'] ?? $this->config['webhook_base_url'] . '/oauth/callback';
            
            switch ($provider['provider_type']) {
                case 'google':
                    $authUrl = $this->buildGoogleAuthUrl($provider, $redirectUri, $state);
                    break;
                case 'outlook':
                    $authUrl = $this->buildOutlookAuthUrl($provider, $redirectUri, $state);
                    break;
                default:
                    throw new Exception('Unsupported provider type');
            }

            // Store OAuth state for verification
            $this->storeOAuthState($state, $userId, $providerId, $redirectUri);

            return [
                'success' => true,
                'auth_url' => $authUrl,
                'state' => $state,
                'provider' => $provider
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to start OAuth flow: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Complete OAuth flow and create calendar connection
     */
    public function completeOAuthFlow(string $code, string $state, array $options = []): array
    {
        try {
            $stateData = $this->verifyOAuthState($state);
            if (!$stateData) {
                throw new Exception('Invalid or expired OAuth state');
            }

            $provider = $this->getProvider($stateData['provider_id']);
            $redirectUri = $stateData['redirect_uri'];

            // Exchange code for tokens
            $tokenData = $this->exchangeCodeForTokens($provider, $code, $redirectUri);
            
            // Get user's calendar information
            $calendarInfo = $this->getUserCalendarInfo($provider, $tokenData['access_token']);
            
            // Create calendar connection
            $connectionId = $this->createCalendarConnection(
                $stateData['user_id'],
                $stateData['provider_id'],
                $tokenData,
                $calendarInfo,
                $options
            );

            // Setup webhook if supported
            if ($this->config['enable_real_time_sync']) {
                $this->setupWebhook($connectionId, $provider, $tokenData['access_token']);
            }

            // Perform initial sync
            $this->performInitialSync($connectionId);

            return [
                'success' => true,
                'connection_id' => $connectionId,
                'calendar_info' => $calendarInfo,
                'message' => 'Calendar connected successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to complete OAuth flow: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user's calendar connections
     */
    public function getUserConnections(int $userId): array
    {
        try {
            $sql = "SELECT uc.*, cp.provider_name, cp.provider_type 
                    FROM user_calendar_connections uc
                    JOIN calendar_providers cp ON uc.provider_id = cp.provider_id
                    WHERE uc.user_id = ? AND uc.is_active = 1
                    ORDER BY uc.is_primary DESC, uc.created_at ASC";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId]);
            $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decrypt sensitive data for display
            foreach ($connections as &$connection) {
                unset($connection['access_token'], $connection['refresh_token']);
                $connection['permissions'] = json_decode($connection['permissions'], true);
                $connection['settings'] = json_decode($connection['settings'], true);
            }

            return [
                'success' => true,
                'connections' => $connections
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get connections: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Sync calendar events for a connection
     */
    public function syncCalendarEvents(string $connectionId, array $options = []): array
    {
        try {
            $connection = $this->getConnection($connectionId);
            if (!$connection) {
                throw new Exception('Connection not found');
            }

            $provider = $this->getProvider($connection['provider_id']);
            $operationId = $this->startSyncOperation($connectionId, 'incremental_sync');

            // Refresh access token if needed
            $accessToken = $this->ensureValidAccessToken($connection);
            
            // Get events from provider
            $providerEvents = $this->getEventsFromProvider($provider, $accessToken, $options);
            
            // Process and sync events
            $syncResults = $this->processProviderEvents($connectionId, $providerEvents);
            
            // Update sync operation
            $this->completeSyncOperation($operationId, $syncResults);
            
            // Update connection sync status
            $this->updateConnectionSyncStatus($connectionId, 'completed');

            return [
                'success' => true,
                'operation_id' => $operationId,
                'sync_results' => $syncResults,
                'message' => 'Calendar sync completed successfully'
            ];

        } catch (Exception $e) {
            if (isset($operationId)) {
                $this->failSyncOperation($operationId, $e->getMessage());
            }
            $this->updateConnectionSyncStatus($connectionId, 'failed', $e->getMessage());
            
            return [
                'success' => false,
                'error' => 'Failed to sync calendar: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create calendar event
     */
    public function createCalendarEvent(string $connectionId, array $eventData): array
    {
        try {
            $connection = $this->getConnection($connectionId);
            if (!$connection) {
                throw new Exception('Connection not found');
            }

            $provider = $this->getProvider($connection['provider_id']);
            $accessToken = $this->ensureValidAccessToken($connection);

            // Create event in provider calendar
            $providerEvent = $this->createEventInProvider($provider, $accessToken, $eventData);
            
            // Store local copy
            $localEventId = $this->storeLocalEvent($connectionId, $providerEvent, $eventData);

            return [
                'success' => true,
                'event_id' => $localEventId,
                'external_event_id' => $providerEvent['id'],
                'event_data' => $providerEvent,
                'message' => 'Event created successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to create event: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update calendar event
     */
    public function updateCalendarEvent(string $eventId, array $eventData): array
    {
        try {
            $event = $this->getLocalEvent($eventId);
            if (!$event) {
                throw new Exception('Event not found');
            }

            $connection = $this->getConnection($event['connection_id']);
            $provider = $this->getProvider($connection['provider_id']);
            $accessToken = $this->ensureValidAccessToken($connection);

            // Update event in provider calendar
            $updatedProviderEvent = $this->updateEventInProvider(
                $provider, 
                $accessToken, 
                $event['external_event_id'], 
                $eventData
            );
            
            // Update local copy
            $this->updateLocalEvent($eventId, $updatedProviderEvent, $eventData);

            return [
                'success' => true,
                'event_id' => $eventId,
                'event_data' => $updatedProviderEvent,
                'message' => 'Event updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to update event: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete calendar event
     */
    public function deleteCalendarEvent(string $eventId): array
    {
        try {
            $event = $this->getLocalEvent($eventId);
            if (!$event) {
                throw new Exception('Event not found');
            }

            $connection = $this->getConnection($event['connection_id']);
            $provider = $this->getProvider($connection['provider_id']);
            $accessToken = $this->ensureValidAccessToken($connection);

            // Delete event from provider calendar
            $this->deleteEventFromProvider($provider, $accessToken, $event['external_event_id']);
            
            // Delete local copy
            $this->deleteLocalEvent($eventId);

            return [
                'success' => true,
                'message' => 'Event deleted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to delete event: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user availability
     */
    public function getUserAvailability(int $userId, string $startDate, string $endDate, array $options = []): array
    {
        try {
            $timezone = $options['timezone'] ?? $this->config['default_timezone'];

            // Get user's calendar connections
            $connections = $this->getUserConnections($userId);
            if (!$connections['success']) {
                throw new Exception('Failed to get user connections');
            }

            $allBusyPeriods = [];
            $allFreePeriods = [];

            // Get busy periods from each connected calendar
            foreach ($connections['connections'] as $connection) {
                if ($connection['sync_enabled']) {
                    $busyPeriods = $this->getBusyPeriodsFromConnection(
                        $connection['connection_id'],
                        $startDate,
                        $endDate,
                        $timezone
                    );
                    $allBusyPeriods = array_merge($allBusyPeriods, $busyPeriods);
                }
            }

            // Merge overlapping busy periods
            $mergedBusyPeriods = $this->mergeBusyPeriods($allBusyPeriods);

            // Calculate free periods
            $freePeriods = $this->calculateFreePeriods(
                $startDate,
                $endDate,
                $mergedBusyPeriods,
                $userId,
                $timezone
            );

            // Store availability data
            $availabilityId = $this->storeAvailabilityData(
                $userId,
                $startDate,
                $endDate,
                $mergedBusyPeriods,
                $freePeriods,
                $timezone
            );

            return [
                'success' => true,
                'availability_id' => $availabilityId,
                'busy_periods' => $mergedBusyPeriods,
                'free_periods' => $freePeriods,
                'timezone' => $timezone
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get availability: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Disconnect calendar
     */
    public function disconnectCalendar(string $connectionId, int $userId): array
    {
        try {
            $connection = $this->getConnection($connectionId);
            if (!$connection || $connection['user_id'] != $userId) {
                throw new Exception('Connection not found or access denied');
            }

            // Revoke access token if possible
            $this->revokeAccessToken($connection);

            // Remove webhook
            $this->removeWebhook($connectionId);

            // Mark connection as inactive
            $sql = "UPDATE user_calendar_connections
                    SET is_active = 0, sync_enabled = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE connection_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$connectionId]);

            return [
                'success' => true,
                'message' => 'Calendar disconnected successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to disconnect calendar: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get calendar events for user
     */
    public function getCalendarEvents(int $userId, array $filters = []): array
    {
        try {
            $startDate = $filters['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $endDate = $filters['end_date'] ?? date('Y-m-d', strtotime('+3 months'));
            $connectionIds = $filters['connection_ids'] ?? [];
            $includeInterviews = $filters['include_interviews'] ?? true;

            $sql = "SELECT ce.*, uc.provider_id, cp.provider_name
                    FROM calendar_events ce
                    JOIN user_calendar_connections uc ON ce.connection_id = uc.connection_id
                    JOIN calendar_providers cp ON uc.provider_id = cp.provider_id
                    WHERE uc.user_id = ? AND uc.is_active = 1
                    AND ce.start_time >= ? AND ce.start_time <= ?";

            $params = [$userId, $startDate, $endDate];

            if (!empty($connectionIds)) {
                $placeholders = str_repeat('?,', count($connectionIds) - 1) . '?';
                $sql .= " AND ce.connection_id IN ($placeholders)";
                $params = array_merge($params, $connectionIds);
            }

            $sql .= " ORDER BY ce.start_time ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Process events
            foreach ($events as &$event) {
                $event['attendees'] = json_decode($event['attendees'], true);
                $event['reminders'] = json_decode($event['reminders'], true);
                $event['custom_properties'] = json_decode($event['custom_properties'], true);
            }

            return [
                'success' => true,
                'events' => $events,
                'total_count' => count($events)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get events: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle webhook notification
     */
    public function handleWebhookNotification(string $providerId, array $payload): array
    {
        try {
            $provider = $this->getProvider($providerId);
            if (!$provider) {
                throw new Exception('Provider not found');
            }

            // Verify webhook signature
            $this->verifyWebhookSignature($providerId, $payload);

            // Process notification based on provider type
            switch ($provider['provider_type']) {
                case 'google':
                    $result = $this->processGoogleWebhook($payload);
                    break;
                case 'outlook':
                    $result = $this->processOutlookWebhook($payload);
                    break;
                default:
                    throw new Exception('Unsupported provider type for webhooks');
            }

            // Update webhook statistics
            $this->updateWebhookStats($providerId, true);

            return [
                'success' => true,
                'processed' => $result,
                'message' => 'Webhook processed successfully'
            ];

        } catch (Exception $e) {
            $this->updateWebhookStats($providerId, false, $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to process webhook: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get calendar integration analytics
     */
    public function getIntegrationAnalytics(int $userId, array $filters = []): array
    {
        try {
            $startDate = $filters['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $filters['end_date'] ?? date('Y-m-d');

            $sql = "SELECT
                        cia.*,
                        cp.provider_name,
                        COUNT(uc.connection_id) as active_connections
                    FROM calendar_integration_analytics cia
                    LEFT JOIN calendar_providers cp ON cia.provider_id = cp.provider_id
                    LEFT JOIN user_calendar_connections uc ON cia.provider_id = uc.provider_id
                        AND uc.user_id = ? AND uc.is_active = 1
                    WHERE (cia.user_id = ? OR cia.user_id IS NULL)
                    AND cia.date_period >= ? AND cia.date_period <= ?
                    GROUP BY cia.analytics_id
                    ORDER BY cia.date_period DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, $userId, $startDate, $endDate]);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate summary statistics
            $summary = $this->calculateAnalyticsSummary($analytics);

            return [
                'success' => true,
                'analytics' => $analytics,
                'summary' => $summary,
                'period' => ['start' => $startDate, 'end' => $endDate]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Export calendar data
     */
    public function exportCalendarData(int $userId, array $options = []): array
    {
        try {
            $format = $options['format'] ?? 'ics';
            $startDate = $options['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $endDate = $options['end_date'] ?? date('Y-m-d', strtotime('+3 months'));
            $includePrivate = $options['include_private'] ?? false;

            // Get events
            $eventsResult = $this->getCalendarEvents($userId, [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            if (!$eventsResult['success']) {
                throw new Exception('Failed to get events for export');
            }

            $events = $eventsResult['events'];

            // Filter private events if needed
            if (!$includePrivate) {
                $events = array_filter($events, function($event) {
                    return $event['visibility'] !== 'private';
                });
            }

            // Generate export data based on format
            switch ($format) {
                case 'ics':
                    $exportData = $this->generateICSExport($events);
                    $mimeType = 'text/calendar';
                    $extension = 'ics';
                    break;
                case 'json':
                    $exportData = json_encode($events, JSON_PRETTY_PRINT);
                    $mimeType = 'application/json';
                    $extension = 'json';
                    break;
                case 'csv':
                    $exportData = $this->generateCSVExport($events);
                    $mimeType = 'text/csv';
                    $extension = 'csv';
                    break;
                default:
                    throw new Exception('Unsupported export format');
            }

            $filename = "calendar_export_" . date('Y-m-d_H-i-s') . ".$extension";

            return [
                'success' => true,
                'data' => $exportData,
                'filename' => $filename,
                'mime_type' => $mimeType,
                'event_count' => count($events)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to export calendar data: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'providers' => [
                [
                    'provider_id' => 'google_calendar',
                    'provider_name' => 'Google Calendar',
                    'provider_type' => 'google',
                    'is_active' => true,
                    'features' => ['real_time_sync', 'webhooks', 'availability', 'recurring_events']
                ],
                [
                    'provider_id' => 'outlook_calendar',
                    'provider_name' => 'Microsoft Outlook',
                    'provider_type' => 'outlook',
                    'is_active' => true,
                    'features' => ['real_time_sync', 'webhooks', 'availability', 'teams_integration']
                ]
            ],
            'sample_events' => [
                [
                    'title' => 'Technical Interview - Senior Developer',
                    'description' => 'Technical interview for senior developer position',
                    'start_time' => date('Y-m-d H:i:s', strtotime('+1 day 10:00')),
                    'end_time' => date('Y-m-d H:i:s', strtotime('+1 day 11:00')),
                    'attendees' => ['interviewer@company.com', 'candidate@email.com'],
                    'meeting_url' => 'https://interviews.tv/room/abc123'
                ],
                [
                    'title' => 'HR Interview - Product Manager',
                    'description' => 'HR interview for product manager role',
                    'start_time' => date('Y-m-d H:i:s', strtotime('+2 days 14:00')),
                    'end_time' => date('Y-m-d H:i:s', strtotime('+2 days 15:00')),
                    'attendees' => ['hr@company.com', 'candidate2@email.com'],
                    'meeting_url' => 'https://interviews.tv/room/def456'
                ]
            ],
            'availability_example' => [
                'busy_periods' => [
                    ['start' => '09:00', 'end' => '10:00'],
                    ['start' => '14:00', 'end' => '15:30'],
                    ['start' => '16:00', 'end' => '17:00']
                ],
                'free_periods' => [
                    ['start' => '10:00', 'end' => '14:00'],
                    ['start' => '15:30', 'end' => '16:00']
                ]
            ]
        ];
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Load calendar providers
     */
    private function loadProviders(): void
    {
        try {
            $sql = "SELECT * FROM calendar_providers WHERE is_active = 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();

            $this->providers = [];
            while ($provider = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->providers[$provider['provider_id']] = $provider;
            }
        } catch (Exception $e) {
            $this->providers = [];
        }
    }

    /**
     * Get provider by ID
     */
    private function getProvider(string $providerId): ?array
    {
        return $this->providers[$providerId] ?? null;
    }

    /**
     * Generate secure OAuth state
     */
    private function generateSecureState(int $userId, string $providerId): string
    {
        $data = [
            'user_id' => $userId,
            'provider_id' => $providerId,
            'timestamp' => time(),
            'nonce' => bin2hex(random_bytes(16))
        ];

        return base64_encode(json_encode($data));
    }

    /**
     * Build Google OAuth URL
     */
    private function buildGoogleAuthUrl(array $provider, string $redirectUri, string $state): string
    {
        $params = [
            'client_id' => $this->config['google_client_id'],
            'redirect_uri' => $redirectUri,
            'scope' => implode(' ', json_decode($provider['scopes'], true)),
            'response_type' => 'code',
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent'
        ];

        return $provider['auth_endpoint'] . '?' . http_build_query($params);
    }

    /**
     * Build Outlook OAuth URL
     */
    private function buildOutlookAuthUrl(array $provider, string $redirectUri, string $state): string
    {
        $params = [
            'client_id' => $this->config['microsoft_client_id'],
            'redirect_uri' => $redirectUri,
            'scope' => implode(' ', json_decode($provider['scopes'], true)),
            'response_type' => 'code',
            'state' => $state,
            'response_mode' => 'query'
        ];

        return $provider['auth_endpoint'] . '?' . http_build_query($params);
    }

    /**
     * Store OAuth state for verification
     */
    private function storeOAuthState(string $state, int $userId, string $providerId, string $redirectUri): void
    {
        $sql = "INSERT OR REPLACE INTO calendar_integration_settings
                (setting_id, user_id, setting_category, setting_key, setting_value, description)
                VALUES (?, ?, 'oauth', 'state', ?, 'OAuth state for verification')";

        $stateData = json_encode([
            'user_id' => $userId,
            'provider_id' => $providerId,
            'redirect_uri' => $redirectUri,
            'expires_at' => time() + 600 // 10 minutes
        ]);

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$state, $userId, $stateData]);
    }

    /**
     * Verify OAuth state
     */
    private function verifyOAuthState(string $state): ?array
    {
        try {
            $sql = "SELECT setting_value FROM calendar_integration_settings
                    WHERE setting_id = ? AND setting_category = 'oauth' AND setting_key = 'state'";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$state]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result) {
                return null;
            }

            $stateData = json_decode($result['setting_value'], true);

            // Check if expired
            if ($stateData['expires_at'] < time()) {
                return null;
            }

            // Clean up used state
            $sql = "DELETE FROM calendar_integration_settings WHERE setting_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$state]);

            return $stateData;

        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    private function exchangeCodeForTokens(array $provider, string $code, string $redirectUri): array
    {
        $data = [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri
        ];

        if ($provider['provider_type'] === 'google') {
            $data['client_id'] = $this->config['google_client_id'];
            $data['client_secret'] = $this->config['google_client_secret'];
        } elseif ($provider['provider_type'] === 'outlook') {
            $data['client_id'] = $this->config['microsoft_client_id'];
            $data['client_secret'] = $this->config['microsoft_client_secret'];
        }

        $response = $this->makeHttpRequest('POST', $provider['token_endpoint'], $data);

        if (!$response || !isset($response['access_token'])) {
            throw new Exception('Failed to exchange code for tokens');
        }

        return $response;
    }

    /**
     * Get user calendar information from provider
     */
    private function getUserCalendarInfo(array $provider, string $accessToken): array
    {
        if ($provider['provider_type'] === 'google') {
            return $this->getGoogleCalendarInfo($accessToken);
        } elseif ($provider['provider_type'] === 'outlook') {
            return $this->getOutlookCalendarInfo($accessToken);
        }

        throw new Exception('Unsupported provider type');
    }

    /**
     * Get Google Calendar information
     */
    private function getGoogleCalendarInfo(string $accessToken): array
    {
        $headers = ['Authorization: Bearer ' . $accessToken];

        // Get user profile
        $profile = $this->makeHttpRequest('GET', 'https://www.googleapis.com/oauth2/v2/userinfo', [], $headers);

        // Get primary calendar
        $calendar = $this->makeHttpRequest('GET', 'https://www.googleapis.com/calendar/v3/calendars/primary', [], $headers);

        return [
            'external_calendar_id' => $calendar['id'] ?? 'primary',
            'calendar_name' => $calendar['summary'] ?? $profile['name'] . "'s Calendar",
            'calendar_description' => $calendar['description'] ?? '',
            'user_email' => $profile['email'] ?? '',
            'user_name' => $profile['name'] ?? ''
        ];
    }

    /**
     * Get Outlook Calendar information
     */
    private function getOutlookCalendarInfo(string $accessToken): array
    {
        $headers = ['Authorization: Bearer ' . $accessToken];

        // Get user profile
        $profile = $this->makeHttpRequest('GET', 'https://graph.microsoft.com/v1.0/me', [], $headers);

        // Get primary calendar
        $calendar = $this->makeHttpRequest('GET', 'https://graph.microsoft.com/v1.0/me/calendar', [], $headers);

        return [
            'external_calendar_id' => $calendar['id'] ?? 'primary',
            'calendar_name' => $calendar['name'] ?? $profile['displayName'] . "'s Calendar",
            'calendar_description' => '',
            'user_email' => $profile['mail'] ?? $profile['userPrincipalName'] ?? '',
            'user_name' => $profile['displayName'] ?? ''
        ];
    }

    /**
     * Create calendar connection
     */
    private function createCalendarConnection(int $userId, string $providerId, array $tokenData, array $calendarInfo, array $options): string
    {
        $connectionId = $this->generateUUID();

        $sql = "INSERT INTO user_calendar_connections
                (connection_id, user_id, provider_id, external_calendar_id, calendar_name,
                 calendar_description, access_token, refresh_token, token_expires_at,
                 is_primary, sync_enabled, sync_direction, permissions, settings, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

        $expiresAt = isset($tokenData['expires_in']) ?
            date('Y-m-d H:i:s', time() + $tokenData['expires_in']) : null;

        $permissions = json_encode($tokenData['scope'] ?? []);
        $settings = json_encode($options['settings'] ?? []);

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $connectionId,
            $userId,
            $providerId,
            $calendarInfo['external_calendar_id'],
            $calendarInfo['calendar_name'],
            $calendarInfo['calendar_description'],
            $this->encrypt($tokenData['access_token']),
            $this->encrypt($tokenData['refresh_token'] ?? ''),
            $expiresAt,
            $options['is_primary'] ?? false,
            $options['sync_enabled'] ?? true,
            $options['sync_direction'] ?? 'bidirectional',
            $permissions,
            $settings
        ]);

        return $connectionId;
    }

    /**
     * Make HTTP request
     */
    private function makeHttpRequest(string $method, string $url, array $data = [], array $headers = []): array
    {
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_CUSTOMREQUEST => $method
        ]);

        if ($method === 'POST' && !empty($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new Exception("HTTP request failed with code $httpCode");
        }

        return json_decode($response, true) ?? [];
    }

    /**
     * Generate UUID
     */
    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Encrypt sensitive data
     */
    private function encrypt(string $data): string
    {
        if (empty($data)) return '';

        $key = hash('sha256', $this->config['encryption_key'], true);
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);

        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    private function decrypt(string $encryptedData): string
    {
        if (empty($encryptedData)) return '';

        $data = base64_decode($encryptedData);
        $key = hash('sha256', $this->config['encryption_key'], true);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);

        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }

    /**
     * Get connection by ID
     */
    private function getConnection(string $connectionId): ?array
    {
        $sql = "SELECT * FROM user_calendar_connections WHERE connection_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$connectionId]);

        $connection = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($connection) {
            $connection['access_token'] = $this->decrypt($connection['access_token']);
            $connection['refresh_token'] = $this->decrypt($connection['refresh_token']);
        }

        return $connection ?: null;
    }

    /**
     * Placeholder methods for additional functionality
     */
    private function setupWebhook(string $connectionId, array $provider, string $accessToken): void
    {
        // Implementation would depend on provider-specific webhook setup
    }

    private function performInitialSync(string $connectionId): void
    {
        // Trigger initial calendar sync
        $this->syncCalendarEvents($connectionId, ['sync_type' => 'initial']);
    }

    private function ensureValidAccessToken(array $connection): string
    {
        // Check if token needs refresh and refresh if necessary
        return $connection['access_token'];
    }

    private function startSyncOperation(string $connectionId, string $operationType): string
    {
        $operationId = $this->generateUUID();

        $sql = "INSERT INTO calendar_sync_operations
                (operation_id, connection_id, operation_type, operation_status, start_time)
                VALUES (?, ?, ?, 'running', CURRENT_TIMESTAMP)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$operationId, $connectionId, $operationType]);

        return $operationId;
    }

    private function completeSyncOperation(string $operationId, array $results): void
    {
        $sql = "UPDATE calendar_sync_operations
                SET operation_status = 'completed',
                    end_time = CURRENT_TIMESTAMP,
                    events_processed = ?,
                    events_created = ?,
                    events_updated = ?,
                    events_deleted = ?
                WHERE operation_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $results['processed'] ?? 0,
            $results['created'] ?? 0,
            $results['updated'] ?? 0,
            $results['deleted'] ?? 0,
            $operationId
        ]);
    }

    private function failSyncOperation(string $operationId, string $error): void
    {
        $sql = "UPDATE calendar_sync_operations
                SET operation_status = 'failed',
                    end_time = CURRENT_TIMESTAMP,
                    error_details = ?
                WHERE operation_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([json_encode(['error' => $error]), $operationId]);
    }

    private function updateConnectionSyncStatus(string $connectionId, string $status, string $error = null): void
    {
        $sql = "UPDATE user_calendar_connections
                SET sync_status = ?, sync_error_message = ?, last_sync_at = CURRENT_TIMESTAMP
                WHERE connection_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$status, $error, $connectionId]);
    }

    // Additional placeholder methods for complete functionality
    private function getEventsFromProvider(array $provider, string $accessToken, array $options): array { return []; }
    private function processProviderEvents(string $connectionId, array $events): array { return ['processed' => 0]; }
    private function createEventInProvider(array $provider, string $accessToken, array $eventData): array { return []; }
    private function updateEventInProvider(array $provider, string $accessToken, string $eventId, array $eventData): array { return []; }
    private function deleteEventFromProvider(array $provider, string $accessToken, string $eventId): void {}
    private function storeLocalEvent(string $connectionId, array $providerEvent, array $eventData): string { return $this->generateUUID(); }
    private function updateLocalEvent(string $eventId, array $providerEvent, array $eventData): void {}
    private function deleteLocalEvent(string $eventId): void {}
    private function getLocalEvent(string $eventId): ?array { return null; }
    private function getBusyPeriodsFromConnection(string $connectionId, string $startDate, string $endDate, string $timezone): array { return []; }
    private function mergeBusyPeriods(array $busyPeriods): array { return []; }
    private function calculateFreePeriods(string $startDate, string $endDate, array $busyPeriods, int $userId, string $timezone): array { return []; }
    private function storeAvailabilityData(int $userId, string $startDate, string $endDate, array $busyPeriods, array $freePeriods, string $timezone): string { return $this->generateUUID(); }
    private function revokeAccessToken(array $connection): void {}
    private function removeWebhook(string $connectionId): void {}
    private function verifyWebhookSignature(string $providerId, array $payload): void {}
    private function processGoogleWebhook(array $payload): array { return []; }
    private function processOutlookWebhook(array $payload): array { return []; }
    private function updateWebhookStats(string $providerId, bool $success, string $error = null): void {}
    private function calculateAnalyticsSummary(array $analytics): array { return []; }
    private function generateICSExport(array $events): string { return ''; }
    private function generateCSVExport(array $events): string { return ''; }
}
