<?php

namespace App\Controllers;

use App\Services\ThirdPartyIntegrationService;
use PDO;

/**
 * Third-Party Integration Controller
 * Handles REST API endpoints for third-party app integrations
 */
class ThirdPartyIntegrationController
{
    private $integrationService;

    public function __construct(PDO $db)
    {
        $this->integrationService = new ThirdPartyIntegrationService($db);
    }

    /**
     * Get available third-party apps
     * GET /api/integrations/apps
     */
    public function getAvailableApps(): void
    {
        try {
            $category = $_GET['category'] ?? null;
            $status = $_GET['status'] ?? 'active';
            $search = $_GET['search'] ?? null;

            $result = $this->integrationService->getAvailableApps([
                'category' => $category,
                'status' => $status,
                'search' => $search
            ]);

            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get available apps: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get app details
     * GET /api/integrations/apps/{app_id}
     */
    public function getAppDetails(): void
    {
        try {
            $appId = $_GET['app_id'] ?? '';

            if (empty($appId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'App ID is required'
                ], 400);
                return;
            }

            $result = $this->integrationService->getAppDetails($appId);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get app details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's app connections
     * GET /api/integrations/connections
     */
    public function getUserConnections(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $appId = $_GET['app_id'] ?? null;
            $isActive = isset($_GET['is_active']) ? (bool)$_GET['is_active'] : null;

            $result = $this->integrationService->getUserConnections($userId, [
                'app_id' => $appId,
                'is_active' => $isActive
            ]);

            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get connections: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create OAuth authorization URL
     * POST /api/integrations/connect
     */
    public function createAuthorizationUrl(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $appId = $input['app_id'] ?? '';
            $scopes = $input['scopes'] ?? [];
            $options = $input['options'] ?? [];

            if (empty($appId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'App ID is required'
                ], 400);
                return;
            }

            $result = $this->integrationService->createAuthorizationUrl($userId, $appId, $scopes, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to create authorization URL: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle OAuth callback
     * POST /api/integrations/oauth/callback
     */
    public function handleOAuthCallback(): void
    {
        try {
            $code = $_GET['code'] ?? $_POST['code'] ?? '';
            $state = $_GET['state'] ?? $_POST['state'] ?? '';

            if (empty($code) || empty($state)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Authorization code and state are required'
                ], 400);
                return;
            }

            $result = $this->integrationService->handleOAuthCallback($code, $state);
            
            if ($result['success']) {
                // Redirect to success page or return JSON based on Accept header
                $acceptHeader = $_SERVER['HTTP_ACCEPT'] ?? '';
                if (strpos($acceptHeader, 'application/json') !== false) {
                    $this->sendJsonResponse($result);
                } else {
                    // Redirect to frontend success page
                    header('Location: /integrations?success=1&app=' . urlencode($result['data']['app_name']));
                    exit;
                }
            } else {
                $this->sendJsonResponse($result, 400);
            }

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to handle OAuth callback: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Disconnect app
     * DELETE /api/integrations/connections/{connection_id}
     */
    public function disconnectApp(): void
    {
        try {
            $connectionId = $_GET['connection_id'] ?? '';
            $userId = $this->getCurrentUserId();

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->integrationService->disconnectApp($userId, $connectionId);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to disconnect app: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create workflow
     * POST /api/integrations/workflows
     */
    public function createWorkflow(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $requiredFields = ['name', 'trigger_type'];
            foreach ($requiredFields as $field) {
                if (empty($input[$field])) {
                    $this->sendJsonResponse([
                        'success' => false,
                        'message' => ucfirst($field) . ' is required'
                    ], 400);
                    return;
                }
            }

            $result = $this->integrationService->createWorkflow($userId, $input);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to create workflow: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user workflows
     * GET /api/integrations/workflows
     */
    public function getUserWorkflows(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $isActive = isset($_GET['is_active']) ? (bool)$_GET['is_active'] : null;
            $triggerType = $_GET['trigger_type'] ?? null;

            $result = $this->integrationService->getUserWorkflows($userId, [
                'is_active' => $isActive,
                'trigger_type' => $triggerType
            ]);

            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get workflows: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Execute workflow
     * POST /api/integrations/workflows/{workflow_id}/execute
     */
    public function executeWorkflow(): void
    {
        try {
            $workflowId = $_GET['workflow_id'] ?? '';
            $input = json_decode(file_get_contents('php://input'), true);
            $triggerData = $input['trigger_data'] ?? [];

            if (empty($workflowId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Workflow ID is required'
                ], 400);
                return;
            }

            $result = $this->integrationService->executeWorkflow($workflowId, $triggerData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to execute workflow: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get integration templates
     * GET /api/integrations/templates
     */
    public function getIntegrationTemplates(): void
    {
        try {
            $category = $_GET['category'] ?? null;
            $appId = $_GET['app_id'] ?? null;
            $isPublic = isset($_GET['is_public']) ? (bool)$_GET['is_public'] : 1;

            $result = $this->integrationService->getIntegrationTemplates([
                'category' => $category,
                'app_id' => $appId,
                'is_public' => $isPublic
            ]);

            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get templates: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Apply template
     * POST /api/integrations/templates/{template_id}/apply
     */
    public function applyTemplate(): void
    {
        try {
            $templateId = $_GET['template_id'] ?? '';
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            if (empty($templateId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Template ID is required'
                ], 400);
                return;
            }

            $result = $this->integrationService->applyTemplate($userId, $templateId, $input);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to apply template: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get integration analytics
     * GET /api/integrations/analytics
     */
    public function getIntegrationAnalytics(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $appId = $_GET['app_id'] ?? null;
            $connectionId = $_GET['connection_id'] ?? null;
            $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $_GET['end_date'] ?? date('Y-m-d');

            $result = $this->integrationService->getIntegrationAnalytics($userId, [
                'app_id' => $appId,
                'connection_id' => $connectionId,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get demo data
     * GET /api/integrations/demo-data
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->integrationService->getDemoData();
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get demo data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user ID from JWT token
     */
    private function getCurrentUserId(): int
    {
        // For demo purposes, return a default user ID
        // In production, this would extract the user ID from the JWT token
        return 1;
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
