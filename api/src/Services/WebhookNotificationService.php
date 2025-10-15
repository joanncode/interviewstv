<?php

namespace App\Services;

use PDO;
use Exception;
use App\Core\Database;

/**
 * Comprehensive Webhook Notification Service
 * Handles webhook endpoint management, event dispatching, delivery tracking, and analytics
 */
class WebhookNotificationService
{
    private $pdo;
    private $encryptionKey;
    
    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->encryptionKey = $_ENV['WEBHOOK_ENCRYPTION_KEY'] ?? 'default-webhook-key-change-in-production';
    }

    // ==================== WEBHOOK ENDPOINT MANAGEMENT ====================

    /**
     * Create a new webhook endpoint
     */
    public function createWebhookEndpoint(int $userId, array $endpointData): array
    {
        try {
            $endpointId = 'webhook_' . uniqid() . '_' . time();
            
            // Encrypt secret key if provided
            $secretKey = null;
            if (!empty($endpointData['secret_key'])) {
                $secretKey = $this->encryptData($endpointData['secret_key']);
            }

            $sql = "INSERT INTO webhook_endpoints (
                        endpoint_id, user_id, name, url, secret_key, description, 
                        headers, timeout_seconds, retry_attempts, retry_delay_seconds,
                        failure_threshold, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $endpointId,
                $userId,
                $endpointData['name'],
                $endpointData['url'],
                $secretKey,
                $endpointData['description'] ?? null,
                isset($endpointData['headers']) ? json_encode($endpointData['headers']) : null,
                $endpointData['timeout_seconds'] ?? 30,
                $endpointData['retry_attempts'] ?? 3,
                $endpointData['retry_delay_seconds'] ?? 60,
                $endpointData['failure_threshold'] ?? 5,
                $endpointData['is_active'] ?? true
            ]);

            // Initialize rate limiting
            $this->initializeRateLimit($endpointId);

            return [
                'success' => true,
                'endpoint_id' => $endpointId,
                'message' => 'Webhook endpoint created successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to create webhook endpoint: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user's webhook endpoints
     */
    public function getUserWebhookEndpoints(int $userId): array
    {
        try {
            $sql = "SELECT 
                        endpoint_id, name, url, description, is_active,
                        timeout_seconds, retry_attempts, failure_threshold,
                        consecutive_failures, last_success_at, last_failure_at,
                        total_deliveries, successful_deliveries, failed_deliveries,
                        created_at, updated_at
                    FROM webhook_endpoints 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId]);
            $endpoints = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get subscription count for each endpoint
            foreach ($endpoints as &$endpoint) {
                $endpoint['subscription_count'] = $this->getEndpointSubscriptionCount($endpoint['endpoint_id']);
                $endpoint['success_rate'] = $endpoint['total_deliveries'] > 0 
                    ? round(($endpoint['successful_deliveries'] / $endpoint['total_deliveries']) * 100, 2)
                    : 0;
            }

            return [
                'success' => true,
                'endpoints' => $endpoints
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get webhook endpoints: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update webhook endpoint
     */
    public function updateWebhookEndpoint(string $endpointId, int $userId, array $updateData): array
    {
        try {
            $allowedFields = ['name', 'url', 'description', 'headers', 'timeout_seconds', 
                             'retry_attempts', 'retry_delay_seconds', 'failure_threshold', 'is_active'];
            
            $updateFields = [];
            $params = [];

            foreach ($updateData as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    if ($field === 'headers' && is_array($value)) {
                        $updateFields[] = "$field = ?";
                        $params[] = json_encode($value);
                    } else {
                        $updateFields[] = "$field = ?";
                        $params[] = $value;
                    }
                }
            }

            if (empty($updateFields)) {
                throw new Exception('No valid fields to update');
            }

            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $userId;
            $params[] = $endpointId;

            $sql = "UPDATE webhook_endpoints SET " . implode(', ', $updateFields) . 
                   " WHERE user_id = ? AND endpoint_id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            return [
                'success' => true,
                'message' => 'Webhook endpoint updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to update webhook endpoint: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete webhook endpoint
     */
    public function deleteWebhookEndpoint(string $endpointId, int $userId): array
    {
        try {
            $sql = "DELETE FROM webhook_endpoints WHERE endpoint_id = ? AND user_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$endpointId, $userId]);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            return [
                'success' => true,
                'message' => 'Webhook endpoint deleted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to delete webhook endpoint: ' . $e->getMessage()
            ];
        }
    }

    // ==================== EVENT SUBSCRIPTION MANAGEMENT ====================

    /**
     * Subscribe endpoint to event types
     */
    public function subscribeToEvents(string $endpointId, int $userId, array $eventTypes, array $options = []): array
    {
        try {
            // Verify endpoint ownership
            if (!$this->verifyEndpointOwnership($endpointId, $userId)) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            $subscribed = [];
            $errors = [];

            foreach ($eventTypes as $eventTypeId) {
                try {
                    $subscriptionId = 'sub_' . uniqid() . '_' . time();
                    
                    $sql = "INSERT OR REPLACE INTO webhook_subscriptions 
                            (subscription_id, endpoint_id, event_type_id, filter_conditions, transform_template, is_active)
                            VALUES (?, ?, ?, ?, ?, ?)";

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute([
                        $subscriptionId,
                        $endpointId,
                        $eventTypeId,
                        isset($options['filter_conditions']) ? json_encode($options['filter_conditions']) : null,
                        isset($options['transform_template']) ? json_encode($options['transform_template']) : null,
                        $options['is_active'] ?? true
                    ]);

                    $subscribed[] = $eventTypeId;

                } catch (Exception $e) {
                    $errors[] = "Failed to subscribe to $eventTypeId: " . $e->getMessage();
                }
            }

            return [
                'success' => count($errors) === 0,
                'subscribed' => $subscribed,
                'errors' => $errors,
                'message' => count($subscribed) . ' event subscriptions created'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to create subscriptions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get endpoint subscriptions
     */
    public function getEndpointSubscriptions(string $endpointId, int $userId): array
    {
        try {
            if (!$this->verifyEndpointOwnership($endpointId, $userId)) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            $sql = "SELECT 
                        s.subscription_id, s.event_type_id, s.is_active, s.filter_conditions,
                        s.transform_template, s.created_at, s.updated_at,
                        e.event_name, e.event_category, e.description
                    FROM webhook_subscriptions s
                    JOIN webhook_event_types e ON s.event_type_id = e.event_type_id
                    WHERE s.endpoint_id = ?
                    ORDER BY e.event_category, e.event_name";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$endpointId]);
            $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON fields
            foreach ($subscriptions as &$subscription) {
                if ($subscription['filter_conditions']) {
                    $subscription['filter_conditions'] = json_decode($subscription['filter_conditions'], true);
                }
                if ($subscription['transform_template']) {
                    $subscription['transform_template'] = json_decode($subscription['transform_template'], true);
                }
            }

            return [
                'success' => true,
                'subscriptions' => $subscriptions
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get subscriptions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Unsubscribe from event types
     */
    public function unsubscribeFromEvents(string $endpointId, int $userId, array $eventTypes): array
    {
        try {
            if (!$this->verifyEndpointOwnership($endpointId, $userId)) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            $placeholders = str_repeat('?,', count($eventTypes) - 1) . '?';
            $sql = "DELETE FROM webhook_subscriptions 
                    WHERE endpoint_id = ? AND event_type_id IN ($placeholders)";

            $params = array_merge([$endpointId], $eventTypes);
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            return [
                'success' => true,
                'unsubscribed_count' => $stmt->rowCount(),
                'message' => 'Unsubscribed from ' . $stmt->rowCount() . ' event types'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to unsubscribe: ' . $e->getMessage()
            ];
        }
    }

    // ==================== EVENT TYPES MANAGEMENT ====================

    /**
     * Get available event types
     */
    public function getAvailableEventTypes(): array
    {
        try {
            $sql = "SELECT event_type_id, event_name, event_category, description, payload_schema, is_active
                    FROM webhook_event_types 
                    WHERE is_active = 1
                    ORDER BY event_category, event_name";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $eventTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group by category
            $grouped = [];
            foreach ($eventTypes as $eventType) {
                $category = $eventType['event_category'];
                if (!isset($grouped[$category])) {
                    $grouped[$category] = [];
                }
                
                if ($eventType['payload_schema']) {
                    $eventType['payload_schema'] = json_decode($eventType['payload_schema'], true);
                }
                
                $grouped[$category][] = $eventType;
            }

            return [
                'success' => true,
                'event_types' => $eventTypes,
                'grouped_by_category' => $grouped
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get event types: ' . $e->getMessage()
            ];
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Verify endpoint ownership
     */
    private function verifyEndpointOwnership(string $endpointId, int $userId): bool
    {
        $sql = "SELECT COUNT(*) FROM webhook_endpoints WHERE endpoint_id = ? AND user_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$endpointId, $userId]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Get endpoint subscription count
     */
    private function getEndpointSubscriptionCount(string $endpointId): int
    {
        $sql = "SELECT COUNT(*) FROM webhook_subscriptions WHERE endpoint_id = ? AND is_active = 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$endpointId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Initialize rate limiting for endpoint
     */
    private function initializeRateLimit(string $endpointId): void
    {
        $sql = "INSERT INTO webhook_rate_limits (rate_limit_id, endpoint_id, time_window_minutes, max_requests)
                VALUES (?, ?, ?, ?)";
        
        $rateLimitId = 'rate_' . uniqid();
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$rateLimitId, $endpointId, 60, 1000]); // Default: 1000 requests per hour
    }

    /**
     * Encrypt sensitive data
     */
    private function encryptData(string $data): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    private function decryptData(string $encryptedData): string
    {
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }

    /**
     * Generate unique ID
     */
    private function generateId(string $prefix = ''): string
    {
        return $prefix . uniqid() . '_' . time() . '_' . mt_rand(1000, 9999);
    }

    // ==================== EVENT DISPATCHING ====================

    /**
     * Dispatch webhook event
     */
    public function dispatchEvent(string $eventTypeId, array $eventData, array $options = []): array
    {
        try {
            // Validate event type
            if (!$this->isValidEventType($eventTypeId)) {
                throw new Exception('Invalid event type: ' . $eventTypeId);
            }

            // Queue event for processing
            $queueId = $this->queueEvent($eventTypeId, $eventData, $options);

            // Process immediately if not deferred
            if (!($options['defer'] ?? false)) {
                $this->processQueuedEvent($queueId);
            }

            return [
                'success' => true,
                'queue_id' => $queueId,
                'message' => 'Event dispatched successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to dispatch event: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Queue event for processing
     */
    private function queueEvent(string $eventTypeId, array $eventData, array $options = []): string
    {
        $queueId = $this->generateId('queue_');

        $sql = "INSERT INTO webhook_event_queue
                (queue_id, event_type_id, event_data, entity_type, entity_id, user_id, priority, scheduled_for)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $scheduledFor = isset($options['scheduled_for'])
            ? date('Y-m-d H:i:s', strtotime($options['scheduled_for']))
            : date('Y-m-d H:i:s');

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $queueId,
            $eventTypeId,
            json_encode($eventData),
            $options['entity_type'] ?? null,
            $options['entity_id'] ?? null,
            $options['user_id'] ?? null,
            $options['priority'] ?? 5,
            $scheduledFor
        ]);

        return $queueId;
    }

    /**
     * Process queued event
     */
    public function processQueuedEvent(string $queueId): array
    {
        try {
            // Get queued event
            $sql = "SELECT * FROM webhook_event_queue WHERE queue_id = ? AND status = 'pending'";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$queueId]);
            $queuedEvent = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$queuedEvent) {
                throw new Exception('Queued event not found or already processed');
            }

            // Mark as processing
            $this->updateQueueStatus($queueId, 'processing');

            // Get subscribed endpoints
            $endpoints = $this->getSubscribedEndpoints($queuedEvent['event_type_id'], $queuedEvent['user_id']);

            $deliveries = [];
            $errors = [];

            foreach ($endpoints as $endpoint) {
                try {
                    $deliveryId = $this->createDelivery($endpoint, $queuedEvent);
                    $deliveries[] = $deliveryId;

                    // Attempt delivery
                    $this->attemptDelivery($deliveryId);

                } catch (Exception $e) {
                    $errors[] = "Failed to deliver to {$endpoint['name']}: " . $e->getMessage();
                }
            }

            // Mark as completed
            $this->updateQueueStatus($queueId, 'completed');

            return [
                'success' => true,
                'deliveries_created' => count($deliveries),
                'errors' => $errors,
                'message' => 'Event processed successfully'
            ];

        } catch (Exception $e) {
            $this->updateQueueStatus($queueId, 'failed', $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to process event: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get subscribed endpoints for event type
     */
    private function getSubscribedEndpoints(string $eventTypeId, ?int $userId = null): array
    {
        $sql = "SELECT
                    e.endpoint_id, e.name, e.url, e.secret_key, e.headers,
                    e.timeout_seconds, e.retry_attempts, e.retry_delay_seconds,
                    s.filter_conditions, s.transform_template
                FROM webhook_endpoints e
                JOIN webhook_subscriptions s ON e.endpoint_id = s.endpoint_id
                WHERE s.event_type_id = ? AND e.is_active = 1 AND s.is_active = 1";

        $params = [$eventTypeId];

        if ($userId) {
            $sql .= " AND e.user_id = ?";
            $params[] = $userId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create delivery record
     */
    private function createDelivery(array $endpoint, array $queuedEvent): string
    {
        $deliveryId = $this->generateId('delivery_');

        // Transform payload if template provided
        $payload = json_decode($queuedEvent['event_data'], true);
        if (!empty($endpoint['transform_template'])) {
            $template = json_decode($endpoint['transform_template'], true);
            $payload = $this->transformPayload($payload, $template);
        }

        // Prepare headers
        $headers = ['Content-Type' => 'application/json'];
        if (!empty($endpoint['headers'])) {
            $customHeaders = json_decode($endpoint['headers'], true);
            $headers = array_merge($headers, $customHeaders);
        }

        // Add webhook signature if secret key exists
        if (!empty($endpoint['secret_key'])) {
            $secretKey = $this->decryptData($endpoint['secret_key']);
            $signature = hash_hmac('sha256', json_encode($payload), $secretKey);
            $headers['X-Webhook-Signature'] = 'sha256=' . $signature;
        }

        $sql = "INSERT INTO webhook_deliveries
                (delivery_id, endpoint_id, event_type_id, event_id, payload, headers, max_attempts)
                VALUES (?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $deliveryId,
            $endpoint['endpoint_id'],
            $queuedEvent['event_type_id'],
            $queuedEvent['queue_id'],
            json_encode($payload),
            json_encode($headers),
            $endpoint['retry_attempts'] ?? 3
        ]);

        return $deliveryId;
    }

    /**
     * Attempt webhook delivery
     */
    public function attemptDelivery(string $deliveryId): array
    {
        try {
            // Get delivery details
            $sql = "SELECT d.*, e.url, e.timeout_seconds, e.retry_delay_seconds
                    FROM webhook_deliveries d
                    JOIN webhook_endpoints e ON d.endpoint_id = e.endpoint_id
                    WHERE d.delivery_id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$deliveryId]);
            $delivery = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$delivery) {
                throw new Exception('Delivery not found');
            }

            // Check if max attempts reached
            if ($delivery['attempt_count'] >= $delivery['max_attempts']) {
                throw new Exception('Max delivery attempts reached');
            }

            // Update attempt count
            $this->incrementAttemptCount($deliveryId);

            $startTime = microtime(true);

            // Prepare HTTP request
            $payload = $delivery['payload'];
            $headers = json_decode($delivery['headers'], true);
            $timeout = $delivery['timeout_seconds'] ?? 30;

            // Make HTTP request
            $response = $this->makeHttpRequest($delivery['url'], $payload, $headers, $timeout);

            $processingTime = round((microtime(true) - $startTime) * 1000);

            // Log attempt
            $this->logDeliveryAttempt($deliveryId, $delivery['attempt_count'] + 1, $response, $processingTime);

            // Check if successful
            if ($response['success']) {
                $this->markDeliverySuccess($deliveryId, $response, $processingTime);
                $this->updateEndpointStats($delivery['endpoint_id'], true);

                return [
                    'success' => true,
                    'http_status' => $response['http_status'],
                    'processing_time_ms' => $processingTime,
                    'message' => 'Delivery successful'
                ];
            } else {
                $this->markDeliveryFailed($deliveryId, $response, $processingTime);
                $this->updateEndpointStats($delivery['endpoint_id'], false);

                // Schedule retry if attempts remaining
                if ($delivery['attempt_count'] + 1 < $delivery['max_attempts']) {
                    $this->scheduleRetry($deliveryId, $delivery['retry_delay_seconds'] ?? 60);
                }

                return [
                    'success' => false,
                    'http_status' => $response['http_status'] ?? 0,
                    'error' => $response['error'] ?? 'Unknown error',
                    'processing_time_ms' => $processingTime
                ];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delivery attempt failed: ' . $e->getMessage()
            ];
        }
    }

    // ==================== DELIVERY MANAGEMENT ====================

    /**
     * Get delivery history
     */
    public function getDeliveryHistory(string $endpointId, int $userId, array $options = []): array
    {
        try {
            if (!$this->verifyEndpointOwnership($endpointId, $userId)) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            $page = $options['page'] ?? 1;
            $limit = min($options['limit'] ?? 20, 100);
            $offset = ($page - 1) * $limit;

            $sql = "SELECT
                        d.delivery_id, d.event_type_id, d.status, d.http_status_code,
                        d.attempt_count, d.scheduled_at, d.delivered_at, d.failed_at,
                        d.error_message, d.processing_time_ms,
                        e.event_name, e.event_category
                    FROM webhook_deliveries d
                    JOIN webhook_event_types e ON d.event_type_id = e.event_type_id
                    WHERE d.endpoint_id = ?";

            $params = [$endpointId];

            if (!empty($options['status'])) {
                $sql .= " AND d.status = ?";
                $params[] = $options['status'];
            }

            if (!empty($options['event_type'])) {
                $sql .= " AND d.event_type_id = ?";
                $params[] = $options['event_type'];
            }

            $sql .= " ORDER BY d.created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $deliveries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countSql = "SELECT COUNT(*) FROM webhook_deliveries WHERE endpoint_id = ?";
            $countParams = [$endpointId];

            if (!empty($options['status'])) {
                $countSql .= " AND status = ?";
                $countParams[] = $options['status'];
            }

            if (!empty($options['event_type'])) {
                $countSql .= " AND event_type_id = ?";
                $countParams[] = $options['event_type'];
            }

            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute($countParams);
            $total = $countStmt->fetchColumn();

            return [
                'success' => true,
                'deliveries' => $deliveries,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int) $total,
                    'pages' => ceil($total / $limit)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get delivery history: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Retry failed delivery
     */
    public function retryDelivery(string $deliveryId, int $userId): array
    {
        try {
            // Verify ownership
            $sql = "SELECT d.*, e.user_id
                    FROM webhook_deliveries d
                    JOIN webhook_endpoints e ON d.endpoint_id = e.endpoint_id
                    WHERE d.delivery_id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$deliveryId]);
            $delivery = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$delivery || $delivery['user_id'] != $userId) {
                throw new Exception('Delivery not found or access denied');
            }

            if ($delivery['status'] === 'delivered') {
                throw new Exception('Delivery already successful');
            }

            // Reset delivery for retry
            $sql = "UPDATE webhook_deliveries
                    SET status = 'pending', attempt_count = 0, error_message = NULL,
                        scheduled_at = CURRENT_TIMESTAMP
                    WHERE delivery_id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$deliveryId]);

            // Attempt delivery
            $result = $this->attemptDelivery($deliveryId);

            return [
                'success' => $result['success'],
                'message' => $result['success'] ? 'Delivery retry successful' : 'Delivery retry failed',
                'details' => $result
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retry delivery: ' . $e->getMessage()
            ];
        }
    }

    // ==================== ANALYTICS AND MONITORING ====================

    /**
     * Get webhook analytics
     */
    public function getWebhookAnalytics(string $endpointId, int $userId, array $options = []): array
    {
        try {
            if (!$this->verifyEndpointOwnership($endpointId, $userId)) {
                throw new Exception('Webhook endpoint not found or access denied');
            }

            $days = $options['days'] ?? 30;
            $startDate = date('Y-m-d', strtotime("-$days days"));
            $endDate = date('Y-m-d');

            // Get daily analytics
            $sql = "SELECT
                        date_period,
                        SUM(total_events) as total_events,
                        SUM(successful_deliveries) as successful_deliveries,
                        SUM(failed_deliveries) as failed_deliveries,
                        AVG(average_response_time_ms) as avg_response_time,
                        AVG(uptime_percentage) as uptime_percentage,
                        AVG(error_rate_percentage) as error_rate_percentage
                    FROM webhook_analytics
                    WHERE endpoint_id = ? AND date_period BETWEEN ? AND ?
                    GROUP BY date_period
                    ORDER BY date_period";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$endpointId, $startDate, $endDate]);
            $dailyStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get overall stats
            $overallSql = "SELECT
                            COUNT(*) as total_deliveries,
                            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as successful_deliveries,
                            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_deliveries,
                            AVG(processing_time_ms) as avg_response_time,
                            MIN(processing_time_ms) as min_response_time,
                            MAX(processing_time_ms) as max_response_time
                        FROM webhook_deliveries
                        WHERE endpoint_id = ? AND created_at >= ?";

            $stmt = $this->pdo->prepare($overallSql);
            $stmt->execute([$endpointId, $startDate]);
            $overallStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Calculate success rate
            $successRate = $overallStats['total_deliveries'] > 0
                ? round(($overallStats['successful_deliveries'] / $overallStats['total_deliveries']) * 100, 2)
                : 0;

            // Get event type breakdown
            $eventTypeSql = "SELECT
                                e.event_name,
                                COUNT(*) as delivery_count,
                                SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) as successful_count
                            FROM webhook_deliveries d
                            JOIN webhook_event_types e ON d.event_type_id = e.event_type_id
                            WHERE d.endpoint_id = ? AND d.created_at >= ?
                            GROUP BY d.event_type_id, e.event_name
                            ORDER BY delivery_count DESC";

            $stmt = $this->pdo->prepare($eventTypeSql);
            $stmt->execute([$endpointId, $startDate]);
            $eventTypeBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'analytics' => [
                    'daily_stats' => $dailyStats,
                    'overall_stats' => array_merge($overallStats, ['success_rate' => $successRate]),
                    'event_type_breakdown' => $eventTypeBreakdown,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'days' => $days
                    ]
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Validate event type
     */
    private function isValidEventType(string $eventTypeId): bool
    {
        $sql = "SELECT COUNT(*) FROM webhook_event_types WHERE event_type_id = ? AND is_active = 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$eventTypeId]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Update queue status
     */
    private function updateQueueStatus(string $queueId, string $status, ?string $errorMessage = null): void
    {
        $sql = "UPDATE webhook_event_queue SET status = ?, processed_at = CURRENT_TIMESTAMP";
        $params = [$status];

        if ($errorMessage) {
            $sql .= ", error_message = ?";
            $params[] = $errorMessage;
        }

        $sql .= " WHERE queue_id = ?";
        $params[] = $queueId;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }

    /**
     * Transform payload using template
     */
    private function transformPayload(array $payload, array $template): array
    {
        $transformed = [];

        foreach ($template as $key => $value) {
            if (is_string($value) && strpos($value, '{{') !== false) {
                // Simple template variable replacement
                $transformed[$key] = $this->replaceTemplateVariables($value, $payload);
            } elseif (is_array($value)) {
                $transformed[$key] = $this->transformPayload($payload, $value);
            } else {
                $transformed[$key] = $value;
            }
        }

        return $transformed;
    }

    /**
     * Replace template variables
     */
    private function replaceTemplateVariables(string $template, array $data): string
    {
        return preg_replace_callback('/\{\{([^}]+)\}\}/', function($matches) use ($data) {
            $key = trim($matches[1]);
            return $this->getNestedValue($data, $key) ?? $matches[0];
        }, $template);
    }

    /**
     * Get nested value from array
     */
    private function getNestedValue(array $data, string $key)
    {
        $keys = explode('.', $key);
        $value = $data;

        foreach ($keys as $k) {
            if (is_array($value) && isset($value[$k])) {
                $value = $value[$k];
            } else {
                return null;
            }
        }

        return $value;
    }

    /**
     * Make HTTP request
     */
    private function makeHttpRequest(string $url, string $payload, array $headers, int $timeout): array
    {
        $ch = curl_init();

        // Prepare headers for curl
        $curlHeaders = [];
        foreach ($headers as $key => $value) {
            $curlHeaders[] = "$key: $value";
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $curlHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'Interviews.tv Webhook/1.0'
        ]);

        $response = curl_exec($ch);
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return [
                'success' => false,
                'error' => $error ?: 'HTTP request failed',
                'http_status' => 0
            ];
        }

        $success = $httpStatus >= 200 && $httpStatus < 300;

        return [
            'success' => $success,
            'http_status' => $httpStatus,
            'response_body' => $response,
            'error' => $success ? null : "HTTP $httpStatus"
        ];
    }

    /**
     * Increment delivery attempt count
     */
    private function incrementAttemptCount(string $deliveryId): void
    {
        $sql = "UPDATE webhook_deliveries
                SET attempt_count = attempt_count + 1,
                    first_attempted_at = COALESCE(first_attempted_at, CURRENT_TIMESTAMP),
                    last_attempted_at = CURRENT_TIMESTAMP
                WHERE delivery_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$deliveryId]);
    }

    /**
     * Log delivery attempt
     */
    private function logDeliveryAttempt(string $deliveryId, int $attemptNumber, array $response, int $processingTime): void
    {
        $attemptId = $this->generateId('attempt_');

        $sql = "INSERT INTO webhook_delivery_attempts
                (attempt_id, delivery_id, attempt_number, http_status_code, response_body,
                 response_headers, error_message, processing_time_ms, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $attemptId,
            $deliveryId,
            $attemptNumber,
            $response['http_status'] ?? null,
            $response['response_body'] ?? null,
            null, // response_headers - would need to capture from curl
            $response['error'] ?? null,
            $processingTime,
            'Interviews.tv Webhook/1.0'
        ]);
    }

    /**
     * Mark delivery as successful
     */
    private function markDeliverySuccess(string $deliveryId, array $response, int $processingTime): void
    {
        $sql = "UPDATE webhook_deliveries
                SET status = 'delivered', http_status_code = ?, response_body = ?,
                    delivered_at = CURRENT_TIMESTAMP, processing_time_ms = ?
                WHERE delivery_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $response['http_status'],
            $response['response_body'],
            $processingTime,
            $deliveryId
        ]);
    }

    /**
     * Mark delivery as failed
     */
    private function markDeliveryFailed(string $deliveryId, array $response, int $processingTime): void
    {
        $sql = "UPDATE webhook_deliveries
                SET status = 'failed', http_status_code = ?, response_body = ?,
                    failed_at = CURRENT_TIMESTAMP, processing_time_ms = ?, error_message = ?
                WHERE delivery_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $response['http_status'] ?? 0,
            $response['response_body'] ?? null,
            $processingTime,
            $response['error'] ?? 'Unknown error',
            $deliveryId
        ]);
    }

    /**
     * Schedule delivery retry
     */
    private function scheduleRetry(string $deliveryId, int $delaySeconds): void
    {
        $scheduledAt = date('Y-m-d H:i:s', time() + $delaySeconds);

        $sql = "UPDATE webhook_deliveries
                SET status = 'pending', scheduled_at = ?
                WHERE delivery_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$scheduledAt, $deliveryId]);
    }

    /**
     * Update endpoint statistics
     */
    private function updateEndpointStats(string $endpointId, bool $success): void
    {
        $sql = "UPDATE webhook_endpoints
                SET total_deliveries = total_deliveries + 1,
                    " . ($success ? 'successful_deliveries = successful_deliveries + 1, last_success_at = CURRENT_TIMESTAMP, consecutive_failures = 0'
                                  : 'failed_deliveries = failed_deliveries + 1, last_failure_at = CURRENT_TIMESTAMP, consecutive_failures = consecutive_failures + 1') . "
                WHERE endpoint_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$endpointId]);

        // Disable endpoint if failure threshold reached
        if (!$success) {
            $this->checkFailureThreshold($endpointId);
        }
    }

    /**
     * Check and handle failure threshold
     */
    private function checkFailureThreshold(string $endpointId): void
    {
        $sql = "SELECT consecutive_failures, failure_threshold
                FROM webhook_endpoints
                WHERE endpoint_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$endpointId]);
        $endpoint = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($endpoint && $endpoint['consecutive_failures'] >= $endpoint['failure_threshold']) {
            $sql = "UPDATE webhook_endpoints SET is_active = 0 WHERE endpoint_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$endpointId]);

            // Log security event
            $this->logSecurityEvent($endpointId, 'endpoint_disabled', 'Endpoint disabled due to consecutive failures');
        }
    }

    /**
     * Log security event
     */
    private function logSecurityEvent(string $endpointId, string $eventType, string $description, string $severity = 'medium'): void
    {
        $logId = $this->generateId('security_');

        $sql = "INSERT INTO webhook_security_logs
                (log_id, endpoint_id, event_type, description, severity)
                VALUES (?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$logId, $endpointId, $eventType, $description, $severity]);
    }

    /**
     * Get webhook templates
     */
    public function getWebhookTemplates(): array
    {
        try {
            $sql = "SELECT template_id, name, description, category, endpoint_template,
                           event_subscriptions, payload_template, headers_template, usage_count
                    FROM webhook_templates
                    WHERE is_public = 1
                    ORDER BY category, usage_count DESC, name";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON fields
            foreach ($templates as &$template) {
                $template['endpoint_template'] = json_decode($template['endpoint_template'], true);
                $template['event_subscriptions'] = json_decode($template['event_subscriptions'], true);
                $template['payload_template'] = json_decode($template['payload_template'], true);
                $template['headers_template'] = json_decode($template['headers_template'], true);
            }

            return [
                'success' => true,
                'templates' => $templates
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get templates: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'sample_endpoints' => [
                [
                    'name' => 'Slack Notifications',
                    'url' => 'https://example.com/webhook/slack-notifications',
                    'description' => 'Send interview notifications to Slack',
                    'headers' => ['Content-Type' => 'application/json'],
                    'timeout_seconds' => 30
                ],
                [
                    'name' => 'Discord Notifications',
                    'url' => 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
                    'description' => 'Send notifications to Discord channel',
                    'headers' => ['Content-Type' => 'application/json'],
                    'timeout_seconds' => 30
                ]
            ],
            'sample_events' => [
                [
                    'event_type_id' => 'interview.created',
                    'event_data' => [
                        'interview_id' => 'interview_123',
                        'title' => 'Senior Developer Interview',
                        'host_id' => 1,
                        'guest_id' => 2,
                        'scheduled_at' => date('c', strtotime('+1 hour'))
                    ]
                ],
                [
                    'event_type_id' => 'stream.started',
                    'event_data' => [
                        'stream_id' => 'stream_456',
                        'platform' => 'YouTube',
                        'started_at' => date('c'),
                        'viewer_count' => 25
                    ]
                ]
            ]
        ];
    }
}
