<?php

namespace App\Controllers;

use App\Core\Response;
use App\Core\Request;
use App\Services\WebhookNotificationService;

/**
 * Webhook Notification Controller
 * Handles webhook endpoint management, event subscriptions, and delivery monitoring
 */
class WebhookNotificationController
{
    private $webhookService;

    public function __construct()
    {
        $this->webhookService = new WebhookNotificationService();
    }

    // ==================== WEBHOOK ENDPOINT MANAGEMENT ====================

    /**
     * Get user's webhook endpoints
     * GET /api/webhooks/endpoints
     */
    public function getEndpoints()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $result = $this->webhookService->getUserWebhookEndpoints($user['id']);

            if ($result['success']) {
                return Response::success($result['endpoints'], 'Webhook endpoints retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get webhook endpoints: ' . $e->getMessage());
        }
    }

    /**
     * Create new webhook endpoint
     * POST /api/webhooks/endpoints
     */
    public function createEndpoint()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $data = Request::getJsonBody();

            // Validate required fields
            $required = ['name', 'url'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return Response::error("Field '$field' is required");
                }
            }

            // Validate URL
            if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
                return Response::error('Invalid URL format');
            }

            $result = $this->webhookService->createWebhookEndpoint($user['id'], $data);

            if ($result['success']) {
                return Response::success([
                    'endpoint_id' => $result['endpoint_id']
                ], $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to create webhook endpoint: ' . $e->getMessage());
        }
    }

    /**
     * Update webhook endpoint
     * PUT /api/webhooks/endpoints/{endpointId}
     */
    public function updateEndpoint()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $data = Request::getJsonBody();

            // Validate URL if provided
            if (!empty($data['url']) && !filter_var($data['url'], FILTER_VALIDATE_URL)) {
                return Response::error('Invalid URL format');
            }

            $result = $this->webhookService->updateWebhookEndpoint($endpointId, $user['id'], $data);

            if ($result['success']) {
                return Response::success(null, $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to update webhook endpoint: ' . $e->getMessage());
        }
    }

    /**
     * Delete webhook endpoint
     * DELETE /api/webhooks/endpoints/{endpointId}
     */
    public function deleteEndpoint()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $result = $this->webhookService->deleteWebhookEndpoint($endpointId, $user['id']);

            if ($result['success']) {
                return Response::success(null, $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to delete webhook endpoint: ' . $e->getMessage());
        }
    }

    // ==================== EVENT SUBSCRIPTION MANAGEMENT ====================

    /**
     * Get available event types
     * GET /api/webhooks/event-types
     */
    public function getEventTypes()
    {
        try {
            $result = $this->webhookService->getAvailableEventTypes();

            if ($result['success']) {
                return Response::success($result, 'Event types retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get event types: ' . $e->getMessage());
        }
    }

    /**
     * Get endpoint subscriptions
     * GET /api/webhooks/endpoints/{endpointId}/subscriptions
     */
    public function getSubscriptions()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $result = $this->webhookService->getEndpointSubscriptions($endpointId, $user['id']);

            if ($result['success']) {
                return Response::success($result['subscriptions'], 'Subscriptions retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get subscriptions: ' . $e->getMessage());
        }
    }

    /**
     * Subscribe to event types
     * POST /api/webhooks/endpoints/{endpointId}/subscriptions
     */
    public function subscribeToEvents()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $data = Request::getJsonBody();

            if (empty($data['event_types']) || !is_array($data['event_types'])) {
                return Response::error('Event types array is required');
            }

            $options = [
                'filter_conditions' => $data['filter_conditions'] ?? null,
                'transform_template' => $data['transform_template'] ?? null,
                'is_active' => $data['is_active'] ?? true
            ];

            $result = $this->webhookService->subscribeToEvents($endpointId, $user['id'], $data['event_types'], $options);

            if ($result['success']) {
                return Response::success($result, $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to subscribe to events: ' . $e->getMessage());
        }
    }

    /**
     * Unsubscribe from event types
     * DELETE /api/webhooks/endpoints/{endpointId}/subscriptions
     */
    public function unsubscribeFromEvents()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $data = Request::getJsonBody();

            if (empty($data['event_types']) || !is_array($data['event_types'])) {
                return Response::error('Event types array is required');
            }

            $result = $this->webhookService->unsubscribeFromEvents($endpointId, $user['id'], $data['event_types']);

            if ($result['success']) {
                return Response::success($result, $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to unsubscribe from events: ' . $e->getMessage());
        }
    }

    // ==================== DELIVERY MANAGEMENT ====================

    /**
     * Get delivery history
     * GET /api/webhooks/endpoints/{endpointId}/deliveries
     */
    public function getDeliveryHistory()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $options = [
                'page' => (int) ($_GET['page'] ?? 1),
                'limit' => min((int) ($_GET['limit'] ?? 20), 100),
                'status' => $_GET['status'] ?? null,
                'event_type' => $_GET['event_type'] ?? null
            ];

            $result = $this->webhookService->getDeliveryHistory($endpointId, $user['id'], $options);

            if ($result['success']) {
                return Response::paginated(
                    $result['deliveries'],
                    $result['pagination']['total'],
                    $result['pagination']['page'],
                    $result['pagination']['limit'],
                    'Delivery history retrieved successfully'
                );
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get delivery history: ' . $e->getMessage());
        }
    }

    /**
     * Retry failed delivery
     * POST /api/webhooks/deliveries/{deliveryId}/retry
     */
    public function retryDelivery()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $deliveryId = $_GET['delivery_id'] ?? '';
            if (empty($deliveryId)) {
                return Response::error('Delivery ID is required');
            }

            $result = $this->webhookService->retryDelivery($deliveryId, $user['id']);

            if ($result['success']) {
                return Response::success($result['details'], $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to retry delivery: ' . $e->getMessage());
        }
    }

    // ==================== ANALYTICS AND MONITORING ====================

    /**
     * Get webhook analytics
     * GET /api/webhooks/endpoints/{endpointId}/analytics
     */
    public function getAnalytics()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $endpointId = $_GET['endpoint_id'] ?? '';
            if (empty($endpointId)) {
                return Response::error('Endpoint ID is required');
            }

            $options = [
                'days' => min((int) ($_GET['days'] ?? 30), 365)
            ];

            $result = $this->webhookService->getWebhookAnalytics($endpointId, $user['id'], $options);

            if ($result['success']) {
                return Response::success($result['analytics'], 'Analytics retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get analytics: ' . $e->getMessage());
        }
    }

    // ==================== TESTING AND UTILITIES ====================

    /**
     * Dispatch test event
     * POST /api/webhooks/test-event
     */
    public function dispatchTestEvent()
    {
        try {
            $user = Request::getUser();
            if (!$user) {
                return Response::error('Authentication required', 401);
            }

            $data = Request::getJsonBody();

            if (empty($data['event_type_id'])) {
                return Response::error('Event type ID is required');
            }

            $eventData = $data['event_data'] ?? [
                'test' => true,
                'timestamp' => date('c'),
                'user_id' => $user['id']
            ];

            $options = [
                'user_id' => $user['id'],
                'entity_type' => 'test',
                'entity_id' => 'test_' . time()
            ];

            $result = $this->webhookService->dispatchEvent($data['event_type_id'], $eventData, $options);

            if ($result['success']) {
                return Response::success($result, $result['message']);
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to dispatch test event: ' . $e->getMessage());
        }
    }

    /**
     * Get webhook templates
     * GET /api/webhooks/templates
     */
    public function getTemplates()
    {
        try {
            $result = $this->webhookService->getWebhookTemplates();

            if ($result['success']) {
                return Response::success($result['templates'], 'Templates retrieved successfully');
            } else {
                return Response::error($result['error']);
            }

        } catch (\Exception $e) {
            return Response::error('Failed to get templates: ' . $e->getMessage());
        }
    }

    /**
     * Get demo data
     * GET /api/webhooks/demo-data
     */
    public function getDemoData()
    {
        try {
            $demoData = $this->webhookService->getDemoData();
            return Response::success($demoData, 'Demo data retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to get demo data: ' . $e->getMessage());
        }
    }
}
