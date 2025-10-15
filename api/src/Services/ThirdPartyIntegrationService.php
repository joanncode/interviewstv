<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Third-Party Integration Service
 * Manages comprehensive third-party app integrations, workflows, and automations
 */
class ThirdPartyIntegrationService
{
    private $db;
    private $encryptionKey;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->encryptionKey = $_ENV['ENCRYPTION_KEY'] ?? 'default-key-change-in-production';
    }

    // ==================== APP MANAGEMENT ====================

    /**
     * Get available third-party apps
     */
    public function getAvailableApps(array $options = []): array
    {
        try {
            $category = $options['category'] ?? null;
            $status = $options['status'] ?? 'active';
            $search = $options['search'] ?? null;

            $sql = "SELECT * FROM third_party_apps WHERE status = :status";
            $params = ['status' => $status];

            if ($category) {
                $sql .= " AND app_category = :category";
                $params['category'] = $category;
            }

            if ($search) {
                $sql .= " AND (app_name LIKE :search OR app_description LIKE :search)";
                $params['search'] = '%' . $search . '%';
            }

            $sql .= " ORDER BY app_name";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($apps as &$app) {
                $app['oauth_scopes'] = json_decode($app['oauth_scopes'] ?? '[]', true);
                $app['webhook_events'] = json_decode($app['webhook_events'] ?? '[]', true);
            }

            return [
                'success' => true,
                'data' => $apps,
                'total' => count($apps)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get available apps: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get app details by ID
     */
    public function getAppDetails(string $appId): array
    {
        try {
            $stmt = $this->db->prepare("SELECT * FROM third_party_apps WHERE app_id = :app_id");
            $stmt->execute(['app_id' => $appId]);
            $app = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$app) {
                return [
                    'success' => false,
                    'message' => 'App not found'
                ];
            }

            // Parse JSON fields
            $app['oauth_scopes'] = json_decode($app['oauth_scopes'] ?? '[]', true);
            $app['webhook_events'] = json_decode($app['webhook_events'] ?? '[]', true);

            return [
                'success' => true,
                'data' => $app
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get app details: ' . $e->getMessage()
            ];
        }
    }

    // ==================== CONNECTION MANAGEMENT ====================

    /**
     * Get user's app connections
     */
    public function getUserConnections(int $userId, array $options = []): array
    {
        try {
            $appId = $options['app_id'] ?? null;
            $isActive = $options['is_active'] ?? null;

            $sql = "SELECT c.*, a.app_name, a.app_category, a.app_icon_url 
                    FROM user_app_connections c 
                    JOIN third_party_apps a ON c.app_id = a.app_id 
                    WHERE c.user_id = :user_id";
            $params = ['user_id' => $userId];

            if ($appId) {
                $sql .= " AND c.app_id = :app_id";
                $params['app_id'] = $appId;
            }

            if ($isActive !== null) {
                $sql .= " AND c.is_active = :is_active";
                $params['is_active'] = $isActive ? 1 : 0;
            }

            $sql .= " ORDER BY c.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields and remove sensitive data
            foreach ($connections as &$connection) {
                $connection['granted_scopes'] = json_decode($connection['granted_scopes'] ?? '[]', true);
                $connection['connection_metadata'] = json_decode($connection['connection_metadata'] ?? '{}', true);
                
                // Remove sensitive tokens from response
                unset($connection['access_token']);
                unset($connection['refresh_token']);
                unset($connection['oauth_state']);
            }

            return [
                'success' => true,
                'data' => $connections,
                'total' => count($connections)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get user connections: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create OAuth authorization URL
     */
    public function createAuthorizationUrl(int $userId, string $appId, array $scopes = [], array $options = []): array
    {
        try {
            // Get app details
            $appResult = $this->getAppDetails($appId);
            if (!$appResult['success']) {
                return $appResult;
            }

            $app = $appResult['data'];

            if ($app['oauth_provider'] !== 'oauth2') {
                return [
                    'success' => false,
                    'message' => 'OAuth2 not supported for this app'
                ];
            }

            // Generate secure state parameter
            $state = bin2hex(random_bytes(32));

            // Store state in database for verification
            $stmt = $this->db->prepare("
                INSERT INTO user_app_connections (connection_id, user_id, app_id, oauth_state, is_active) 
                VALUES (:connection_id, :user_id, :app_id, :oauth_state, 0)
                ON CONFLICT(connection_id) DO UPDATE SET oauth_state = :oauth_state
            ");
            
            $connectionId = 'conn_' . uniqid();
            $stmt->execute([
                'connection_id' => $connectionId,
                'user_id' => $userId,
                'app_id' => $appId,
                'oauth_state' => $state
            ]);

            // Use provided scopes or default app scopes
            $requestedScopes = !empty($scopes) ? $scopes : $app['oauth_scopes'];

            // Build authorization URL
            $params = [
                'client_id' => $_ENV[strtoupper($appId) . '_CLIENT_ID'] ?? '',
                'response_type' => 'code',
                'scope' => implode(' ', $requestedScopes),
                'state' => $state,
                'redirect_uri' => $_ENV['APP_URL'] . '/api/integrations/oauth/callback'
            ];

            // Add app-specific parameters
            if (isset($options['access_type'])) {
                $params['access_type'] = $options['access_type'];
            }

            $authUrl = $app['oauth_authorize_url'] . '?' . http_build_query($params);

            return [
                'success' => true,
                'data' => [
                    'authorization_url' => $authUrl,
                    'state' => $state,
                    'connection_id' => $connectionId,
                    'expires_in' => 600 // 10 minutes
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create authorization URL: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    public function handleOAuthCallback(string $code, string $state, array $options = []): array
    {
        try {
            // Find connection by state
            $stmt = $this->db->prepare("
                SELECT c.*, a.* FROM user_app_connections c 
                JOIN third_party_apps a ON c.app_id = a.app_id 
                WHERE c.oauth_state = :state AND c.is_active = 0
            ");
            $stmt->execute(['state' => $state]);
            $connection = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Invalid or expired state parameter'
                ];
            }

            // Exchange authorization code for access token
            $tokenData = $this->exchangeCodeForToken($connection, $code);

            if (!$tokenData['success']) {
                return $tokenData;
            }

            $tokens = $tokenData['data'];

            // Encrypt tokens before storing
            $encryptedAccessToken = $this->encryptToken($tokens['access_token']);
            $encryptedRefreshToken = isset($tokens['refresh_token']) ? $this->encryptToken($tokens['refresh_token']) : null;

            // Calculate token expiration
            $expiresAt = null;
            if (isset($tokens['expires_in'])) {
                $expiresAt = date('Y-m-d H:i:s', time() + $tokens['expires_in']);
            }

            // Get user info from the connected app
            $userInfo = $this->fetchUserInfo($connection, $tokens['access_token']);

            // Update connection with tokens and metadata
            $stmt = $this->db->prepare("
                UPDATE user_app_connections SET 
                    access_token = :access_token,
                    refresh_token = :refresh_token,
                    token_expires_at = :expires_at,
                    granted_scopes = :granted_scopes,
                    connection_metadata = :metadata,
                    is_active = 1,
                    last_used_at = CURRENT_TIMESTAMP,
                    oauth_state = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE connection_id = :connection_id
            ");

            $stmt->execute([
                'connection_id' => $connection['connection_id'],
                'access_token' => $encryptedAccessToken,
                'refresh_token' => $encryptedRefreshToken,
                'expires_at' => $expiresAt,
                'granted_scopes' => json_encode($tokens['scope'] ?? []),
                'metadata' => json_encode($userInfo)
            ]);

            return [
                'success' => true,
                'data' => [
                    'connection_id' => $connection['connection_id'],
                    'app_id' => $connection['app_id'],
                    'app_name' => $connection['app_name'],
                    'user_info' => $userInfo,
                    'granted_scopes' => $tokens['scope'] ?? []
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to handle OAuth callback: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Disconnect app connection
     */
    public function disconnectApp(int $userId, string $connectionId): array
    {
        try {
            // Verify ownership
            $stmt = $this->db->prepare("
                SELECT connection_id FROM user_app_connections 
                WHERE connection_id = :connection_id AND user_id = :user_id
            ");
            $stmt->execute(['connection_id' => $connectionId, 'user_id' => $userId]);
            
            if (!$stmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'Connection not found or access denied'
                ];
            }

            // Deactivate connection (soft delete)
            $stmt = $this->db->prepare("
                UPDATE user_app_connections SET 
                    is_active = 0,
                    access_token = NULL,
                    refresh_token = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE connection_id = :connection_id
            ");
            $stmt->execute(['connection_id' => $connectionId]);

            // Deactivate related workflows
            $stmt = $this->db->prepare("
                UPDATE integration_workflows SET is_active = 0 
                WHERE workflow_id IN (
                    SELECT DISTINCT workflow_id FROM workflow_actions 
                    WHERE connection_id = :connection_id
                )
            ");
            $stmt->execute(['connection_id' => $connectionId]);

            return [
                'success' => true,
                'message' => 'App disconnected successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to disconnect app: ' . $e->getMessage()
            ];
        }
    }

    // ==================== WORKFLOW MANAGEMENT ====================

    /**
     * Create integration workflow
     */
    public function createWorkflow(int $userId, array $workflowData): array
    {
        try {
            $workflowId = 'workflow_' . uniqid();

            $stmt = $this->db->prepare("
                INSERT INTO integration_workflows (
                    workflow_id, user_id, workflow_name, workflow_description,
                    trigger_type, trigger_config, is_active
                ) VALUES (
                    :workflow_id, :user_id, :workflow_name, :workflow_description,
                    :trigger_type, :trigger_config, :is_active
                )
            ");

            $stmt->execute([
                'workflow_id' => $workflowId,
                'user_id' => $userId,
                'workflow_name' => $workflowData['name'],
                'workflow_description' => $workflowData['description'] ?? '',
                'trigger_type' => $workflowData['trigger_type'],
                'trigger_config' => json_encode($workflowData['trigger_config'] ?? []),
                'is_active' => $workflowData['is_active'] ?? 1
            ]);

            // Add workflow actions
            if (isset($workflowData['actions']) && is_array($workflowData['actions'])) {
                foreach ($workflowData['actions'] as $index => $actionData) {
                    $this->addWorkflowAction($workflowId, $actionData, $index + 1);
                }
            }

            return [
                'success' => true,
                'data' => [
                    'workflow_id' => $workflowId,
                    'message' => 'Workflow created successfully'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create workflow: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user workflows
     */
    public function getUserWorkflows(int $userId, array $options = []): array
    {
        try {
            $isActive = $options['is_active'] ?? null;
            $triggerType = $options['trigger_type'] ?? null;

            $sql = "SELECT * FROM integration_workflows WHERE user_id = :user_id";
            $params = ['user_id' => $userId];

            if ($isActive !== null) {
                $sql .= " AND is_active = :is_active";
                $params['is_active'] = $isActive ? 1 : 0;
            }

            if ($triggerType) {
                $sql .= " AND trigger_type = :trigger_type";
                $params['trigger_type'] = $triggerType;
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get actions for each workflow
            foreach ($workflows as &$workflow) {
                $workflow['trigger_config'] = json_decode($workflow['trigger_config'] ?? '{}', true);
                $workflow['actions'] = $this->getWorkflowActions($workflow['workflow_id']);
            }

            return [
                'success' => true,
                'data' => $workflows,
                'total' => count($workflows)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get workflows: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Execute workflow
     */
    public function executeWorkflow(string $workflowId, array $triggerData = []): array
    {
        try {
            // Get workflow details
            $stmt = $this->db->prepare("SELECT * FROM integration_workflows WHERE workflow_id = :workflow_id AND is_active = 1");
            $stmt->execute(['workflow_id' => $workflowId]);
            $workflow = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$workflow) {
                return [
                    'success' => false,
                    'message' => 'Workflow not found or inactive'
                ];
            }

            // Create execution record
            $executionId = 'exec_' . uniqid();
            $stmt = $this->db->prepare("
                INSERT INTO workflow_executions (
                    execution_id, workflow_id, trigger_data, execution_status, started_at
                ) VALUES (
                    :execution_id, :workflow_id, :trigger_data, 'running', CURRENT_TIMESTAMP
                )
            ");

            $stmt->execute([
                'execution_id' => $executionId,
                'workflow_id' => $workflowId,
                'trigger_data' => json_encode($triggerData)
            ]);

            // Get workflow actions
            $actions = $this->getWorkflowActions($workflowId);
            $totalActions = count($actions);
            $successfulActions = 0;
            $failedActions = 0;
            $executionLog = [];

            // Execute each action
            foreach ($actions as $action) {
                $actionResult = $this->executeWorkflowAction($executionId, $action, $triggerData);
                $executionLog[] = $actionResult;

                if ($actionResult['success']) {
                    $successfulActions++;
                } else {
                    $failedActions++;

                    // Stop execution on critical failure
                    if ($actionResult['critical'] ?? false) {
                        break;
                    }
                }
            }

            // Update execution status
            $executionStatus = $failedActions === 0 ? 'completed' : ($successfulActions > 0 ? 'partial' : 'failed');

            $stmt = $this->db->prepare("
                UPDATE workflow_executions SET
                    execution_status = :status,
                    completed_at = CURRENT_TIMESTAMP,
                    total_actions = :total_actions,
                    successful_actions = :successful_actions,
                    failed_actions = :failed_actions,
                    execution_log = :execution_log
                WHERE execution_id = :execution_id
            ");

            $stmt->execute([
                'execution_id' => $executionId,
                'status' => $executionStatus,
                'total_actions' => $totalActions,
                'successful_actions' => $successfulActions,
                'failed_actions' => $failedActions,
                'execution_log' => json_encode($executionLog)
            ]);

            // Update workflow execution count
            $stmt = $this->db->prepare("
                UPDATE integration_workflows SET
                    execution_count = execution_count + 1,
                    last_execution_at = CURRENT_TIMESTAMP,
                    last_execution_status = :status
                WHERE workflow_id = :workflow_id
            ");

            $stmt->execute([
                'workflow_id' => $workflowId,
                'status' => $executionStatus
            ]);

            return [
                'success' => true,
                'data' => [
                    'execution_id' => $executionId,
                    'status' => $executionStatus,
                    'total_actions' => $totalActions,
                    'successful_actions' => $successfulActions,
                    'failed_actions' => $failedActions,
                    'execution_log' => $executionLog
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to execute workflow: ' . $e->getMessage()
            ];
        }
    }

    // ==================== TEMPLATE MANAGEMENT ====================

    /**
     * Get integration templates
     */
    public function getIntegrationTemplates(array $options = []): array
    {
        try {
            $category = $options['category'] ?? null;
            $appId = $options['app_id'] ?? null;
            $isPublic = $options['is_public'] ?? 1;

            $sql = "SELECT t.*, a.app_name, a.app_icon_url
                    FROM integration_templates t
                    JOIN third_party_apps a ON t.app_id = a.app_id
                    WHERE t.is_public = :is_public";
            $params = ['is_public' => $isPublic];

            if ($category) {
                $sql .= " AND t.template_category = :category";
                $params['category'] = $category;
            }

            if ($appId) {
                $sql .= " AND t.app_id = :app_id";
                $params['app_id'] = $appId;
            }

            $sql .= " ORDER BY t.usage_count DESC, t.rating_average DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($templates as &$template) {
                $template['template_config'] = json_decode($template['template_config'] ?? '{}', true);
                $template['required_scopes'] = json_decode($template['required_scopes'] ?? '[]', true);
            }

            return [
                'success' => true,
                'data' => $templates,
                'total' => count($templates)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get templates: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Apply template to create workflow
     */
    public function applyTemplate(int $userId, string $templateId, array $customConfig = []): array
    {
        try {
            // Get template details
            $stmt = $this->db->prepare("SELECT * FROM integration_templates WHERE template_id = :template_id");
            $stmt->execute(['template_id' => $templateId]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) {
                return [
                    'success' => false,
                    'message' => 'Template not found'
                ];
            }

            $templateConfig = json_decode($template['template_config'], true);

            // Merge custom configuration
            $workflowConfig = array_merge($templateConfig, $customConfig);

            // Create workflow from template
            $workflowData = [
                'name' => $customConfig['name'] ?? $template['template_name'],
                'description' => $customConfig['description'] ?? $template['template_description'],
                'trigger_type' => $workflowConfig['trigger'] ?? 'manual',
                'trigger_config' => $workflowConfig['trigger_config'] ?? [],
                'actions' => [$workflowConfig] // Template config becomes the action
            ];

            $result = $this->createWorkflow($userId, $workflowData);

            if ($result['success']) {
                // Update template usage count
                $stmt = $this->db->prepare("UPDATE integration_templates SET usage_count = usage_count + 1 WHERE template_id = :template_id");
                $stmt->execute(['template_id' => $templateId]);
            }

            return $result;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to apply template: ' . $e->getMessage()
            ];
        }
    }

    // ==================== ANALYTICS ====================

    /**
     * Get integration analytics
     */
    public function getIntegrationAnalytics(int $userId, array $options = []): array
    {
        try {
            $appId = $options['app_id'] ?? null;
            $connectionId = $options['connection_id'] ?? null;
            $startDate = $options['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $options['end_date'] ?? date('Y-m-d');

            $sql = "SELECT * FROM app_usage_analytics WHERE user_id = :user_id AND date_period BETWEEN :start_date AND :end_date";
            $params = [
                'user_id' => $userId,
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if ($appId) {
                $sql .= " AND app_id = :app_id";
                $params['app_id'] = $appId;
            }

            if ($connectionId) {
                $sql .= " AND connection_id = :connection_id";
                $params['connection_id'] = $connectionId;
            }

            $sql .= " ORDER BY date_period DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate summary statistics
            $totalCalls = array_sum(array_column($analytics, 'api_calls_count'));
            $totalSuccessful = array_sum(array_column($analytics, 'successful_calls'));
            $totalFailed = array_sum(array_column($analytics, 'failed_calls'));
            $avgResponseTime = $totalCalls > 0 ? array_sum(array_column($analytics, 'average_response_time_ms')) / count($analytics) : 0;
            $successRate = $totalCalls > 0 ? ($totalSuccessful / $totalCalls) * 100 : 0;

            return [
                'success' => true,
                'data' => [
                    'daily_analytics' => $analytics,
                    'summary' => [
                        'total_api_calls' => $totalCalls,
                        'successful_calls' => $totalSuccessful,
                        'failed_calls' => $totalFailed,
                        'success_rate' => round($successRate, 2),
                        'average_response_time_ms' => round($avgResponseTime, 2),
                        'date_range' => [
                            'start' => $startDate,
                            'end' => $endDate
                        ]
                    ]
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Add workflow action
     */
    private function addWorkflowAction(string $workflowId, array $actionData, int $order): void
    {
        $actionId = 'action_' . uniqid();

        $stmt = $this->db->prepare("
            INSERT INTO workflow_actions (
                action_id, workflow_id, connection_id, action_type,
                action_config, execution_order, is_active
            ) VALUES (
                :action_id, :workflow_id, :connection_id, :action_type,
                :action_config, :execution_order, :is_active
            )
        ");

        $stmt->execute([
            'action_id' => $actionId,
            'workflow_id' => $workflowId,
            'connection_id' => $actionData['connection_id'],
            'action_type' => $actionData['action_type'],
            'action_config' => json_encode($actionData['action_config'] ?? []),
            'execution_order' => $order,
            'is_active' => $actionData['is_active'] ?? 1
        ]);
    }

    /**
     * Get workflow actions
     */
    private function getWorkflowActions(string $workflowId): array
    {
        $stmt = $this->db->prepare("
            SELECT a.*, c.app_id, c.connection_name, t.app_name
            FROM workflow_actions a
            JOIN user_app_connections c ON a.connection_id = c.connection_id
            JOIN third_party_apps t ON c.app_id = t.app_id
            WHERE a.workflow_id = :workflow_id AND a.is_active = 1
            ORDER BY a.execution_order
        ");
        $stmt->execute(['workflow_id' => $workflowId]);
        $actions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($actions as &$action) {
            $action['action_config'] = json_decode($action['action_config'] ?? '{}', true);
        }

        return $actions;
    }

    /**
     * Execute workflow action
     */
    private function executeWorkflowAction(string $executionId, array $action, array $triggerData): array
    {
        $actionExecutionId = 'action_exec_' . uniqid();
        $startTime = microtime(true);

        try {
            // Create action execution record
            $stmt = $this->db->prepare("
                INSERT INTO action_executions (
                    action_execution_id, execution_id, action_id, connection_id,
                    execution_status, started_at, attempt_count
                ) VALUES (
                    :action_execution_id, :execution_id, :action_id, :connection_id,
                    'running', CURRENT_TIMESTAMP, 1
                )
            ");

            $stmt->execute([
                'action_execution_id' => $actionExecutionId,
                'execution_id' => $executionId,
                'action_id' => $action['action_id'],
                'connection_id' => $action['connection_id']
            ]);

            // Get connection details with decrypted tokens
            $connection = $this->getConnectionWithTokens($action['connection_id']);
            if (!$connection) {
                throw new Exception('Connection not found or inactive');
            }

            // Execute the specific action based on type
            $result = $this->performAction($connection, $action, $triggerData);

            $endTime = microtime(true);
            $processingTime = round(($endTime - $startTime) * 1000); // Convert to milliseconds

            // Update action execution with success
            $stmt = $this->db->prepare("
                UPDATE action_executions SET
                    execution_status = 'completed',
                    completed_at = CURRENT_TIMESTAMP,
                    response_data = :response_data,
                    processing_time_ms = :processing_time
                WHERE action_execution_id = :action_execution_id
            ");

            $stmt->execute([
                'action_execution_id' => $actionExecutionId,
                'response_data' => json_encode($result),
                'processing_time' => $processingTime
            ]);

            return [
                'success' => true,
                'action_id' => $action['action_id'],
                'action_type' => $action['action_type'],
                'processing_time_ms' => $processingTime,
                'result' => $result
            ];

        } catch (Exception $e) {
            $endTime = microtime(true);
            $processingTime = round(($endTime - $startTime) * 1000);

            // Update action execution with failure
            $stmt = $this->db->prepare("
                UPDATE action_executions SET
                    execution_status = 'failed',
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = :error_message,
                    processing_time_ms = :processing_time
                WHERE action_execution_id = :action_execution_id
            ");

            $stmt->execute([
                'action_execution_id' => $actionExecutionId,
                'error_message' => $e->getMessage(),
                'processing_time' => $processingTime
            ]);

            return [
                'success' => false,
                'action_id' => $action['action_id'],
                'action_type' => $action['action_type'],
                'error' => $e->getMessage(),
                'processing_time_ms' => $processingTime,
                'critical' => false // Most failures are not critical
            ];
        }
    }

    /**
     * Exchange authorization code for access token
     */
    private function exchangeCodeForToken(array $connection, string $code): array
    {
        try {
            $postData = [
                'grant_type' => 'authorization_code',
                'client_id' => $_ENV[strtoupper($connection['app_id']) . '_CLIENT_ID'] ?? '',
                'client_secret' => $_ENV[strtoupper($connection['app_id']) . '_CLIENT_SECRET'] ?? '',
                'code' => $code,
                'redirect_uri' => $_ENV['APP_URL'] . '/api/integrations/oauth/callback'
            ];

            $response = $this->makeHttpRequest('POST', $connection['oauth_token_url'], $postData);

            if (!$response['success']) {
                throw new Exception('Token exchange failed: ' . $response['error']);
            }

            return [
                'success' => true,
                'data' => $response['data']
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Token exchange failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Fetch user info from connected app
     */
    private function fetchUserInfo(array $connection, string $accessToken): array
    {
        try {
            $userInfo = [];

            switch ($connection['app_id']) {
                case 'slack':
                    $response = $this->makeHttpRequest('GET', 'https://slack.com/api/auth.test', [], [
                        'Authorization: Bearer ' . $accessToken
                    ]);
                    if ($response['success']) {
                        $userInfo = [
                            'user_id' => $response['data']['user_id'] ?? '',
                            'team_id' => $response['data']['team_id'] ?? '',
                            'team_name' => $response['data']['team'] ?? '',
                            'user_name' => $response['data']['user'] ?? ''
                        ];
                    }
                    break;

                case 'discord':
                    $response = $this->makeHttpRequest('GET', 'https://discord.com/api/v10/users/@me', [], [
                        'Authorization: Bearer ' . $accessToken
                    ]);
                    if ($response['success']) {
                        $userInfo = [
                            'user_id' => $response['data']['id'] ?? '',
                            'username' => $response['data']['username'] ?? '',
                            'discriminator' => $response['data']['discriminator'] ?? '',
                            'avatar' => $response['data']['avatar'] ?? ''
                        ];
                    }
                    break;

                case 'zoom':
                    $response = $this->makeHttpRequest('GET', 'https://api.zoom.us/v2/users/me', [], [
                        'Authorization: Bearer ' . $accessToken
                    ]);
                    if ($response['success']) {
                        $userInfo = [
                            'user_id' => $response['data']['id'] ?? '',
                            'email' => $response['data']['email'] ?? '',
                            'first_name' => $response['data']['first_name'] ?? '',
                            'last_name' => $response['data']['last_name'] ?? ''
                        ];
                    }
                    break;

                default:
                    $userInfo = ['connected' => true];
                    break;
            }

            return $userInfo;

        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Get connection with decrypted tokens
     */
    private function getConnectionWithTokens(string $connectionId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT c.*, a.* FROM user_app_connections c
            JOIN third_party_apps a ON c.app_id = a.app_id
            WHERE c.connection_id = :connection_id AND c.is_active = 1
        ");
        $stmt->execute(['connection_id' => $connectionId]);
        $connection = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$connection) {
            return null;
        }

        // Decrypt tokens
        if ($connection['access_token']) {
            $connection['access_token'] = $this->decryptToken($connection['access_token']);
        }
        if ($connection['refresh_token']) {
            $connection['refresh_token'] = $this->decryptToken($connection['refresh_token']);
        }

        return $connection;
    }

    /**
     * Perform specific action based on type
     */
    private function performAction(array $connection, array $action, array $triggerData): array
    {
        $actionConfig = $action['action_config'];
        $appId = $connection['app_id'];
        $accessToken = $connection['access_token'];

        switch ($action['action_type']) {
            case 'send_message':
                return $this->sendMessage($appId, $accessToken, $actionConfig, $triggerData);

            case 'create_meeting':
                return $this->createMeeting($appId, $accessToken, $actionConfig, $triggerData);

            case 'upload_file':
                return $this->uploadFile($appId, $accessToken, $actionConfig, $triggerData);

            case 'create_task':
                return $this->createTask($appId, $accessToken, $actionConfig, $triggerData);

            case 'send_webhook':
                return $this->sendWebhook($actionConfig, $triggerData);

            default:
                throw new Exception('Unsupported action type: ' . $action['action_type']);
        }
    }

    /**
     * Send message action
     */
    private function sendMessage(string $appId, string $accessToken, array $config, array $triggerData): array
    {
        $message = $this->processTemplate($config['message_template'] ?? 'Default message', $triggerData);

        switch ($appId) {
            case 'slack':
                return $this->makeHttpRequest('POST', 'https://slack.com/api/chat.postMessage', [
                    'channel' => $config['channel'] ?? '#general',
                    'text' => $message,
                    'username' => $config['username'] ?? 'Interviews.tv'
                ], ['Authorization: Bearer ' . $accessToken]);

            case 'discord':
                return $this->makeHttpRequest('POST', $config['webhook_url'], [
                    'content' => $message,
                    'username' => $config['username'] ?? 'Interviews.tv'
                ]);

            default:
                throw new Exception('Message sending not supported for ' . $appId);
        }
    }

    /**
     * Create meeting action
     */
    private function createMeeting(string $appId, string $accessToken, array $config, array $triggerData): array
    {
        switch ($appId) {
            case 'zoom':
                return $this->makeHttpRequest('POST', 'https://api.zoom.us/v2/users/me/meetings', [
                    'topic' => $config['topic'] ?? 'Interview Meeting',
                    'type' => 2, // Scheduled meeting
                    'duration' => $config['duration'] ?? 60,
                    'settings' => [
                        'waiting_room' => $config['waiting_room'] ?? true,
                        'auto_recording' => $config['recording'] ?? 'none'
                    ]
                ], ['Authorization: Bearer ' . $accessToken]);

            default:
                throw new Exception('Meeting creation not supported for ' . $appId);
        }
    }

    /**
     * Upload file action
     */
    private function uploadFile(string $appId, string $accessToken, array $config, array $triggerData): array
    {
        // This would implement file upload logic for different platforms
        // For demo purposes, return success
        return [
            'success' => true,
            'message' => 'File upload simulated for ' . $appId,
            'file_id' => 'file_' . uniqid()
        ];
    }

    /**
     * Create task action
     */
    private function createTask(string $appId, string $accessToken, array $config, array $triggerData): array
    {
        // This would implement task creation logic for different platforms
        // For demo purposes, return success
        return [
            'success' => true,
            'message' => 'Task creation simulated for ' . $appId,
            'task_id' => 'task_' . uniqid()
        ];
    }

    /**
     * Send webhook action
     */
    private function sendWebhook(array $config, array $triggerData): array
    {
        $payload = array_merge($triggerData, $config['payload'] ?? []);

        return $this->makeHttpRequest('POST', $config['webhook_url'], $payload, [
            'Content-Type: application/json'
        ]);
    }

    /**
     * Process template with trigger data
     */
    private function processTemplate(string $template, array $data): string
    {
        $processed = $template;

        foreach ($data as $key => $value) {
            if (is_string($value) || is_numeric($value)) {
                $processed = str_replace('{{' . $key . '}}', $value, $processed);
            }
        }

        return $processed;
    }

    /**
     * Encrypt token
     */
    private function encryptToken(string $token): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($token, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt token
     */
    private function decryptToken(string $encryptedToken): string
    {
        $data = base64_decode($encryptedToken);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }

    /**
     * Make HTTP request
     */
    private function makeHttpRequest(string $method, string $url, array $data = [], array $headers = []): array
    {
        try {
            $ch = curl_init();

            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_HTTPHEADER => array_merge([
                    'Content-Type: application/json',
                    'User-Agent: Interviews.tv/1.0'
                ], $headers)
            ]);

            if (!empty($data) && in_array($method, ['POST', 'PUT', 'PATCH'])) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                throw new Exception('cURL error: ' . $error);
            }

            $decodedResponse = json_decode($response, true);

            return [
                'success' => $httpCode >= 200 && $httpCode < 300,
                'http_code' => $httpCode,
                'data' => $decodedResponse,
                'raw_response' => $response,
                'error' => $httpCode >= 400 ? 'HTTP ' . $httpCode : null
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'success' => true,
            'data' => [
                'sample_apps' => [
                    ['app_id' => 'slack', 'app_name' => 'Slack', 'category' => 'communication'],
                    ['app_id' => 'discord', 'app_name' => 'Discord', 'category' => 'communication'],
                    ['app_id' => 'zoom', 'app_name' => 'Zoom', 'category' => 'video']
                ],
                'sample_workflows' => [
                    [
                        'workflow_id' => 'demo_workflow_1',
                        'name' => 'Interview Notifications',
                        'trigger_type' => 'event',
                        'status' => 'active',
                        'executions' => 45
                    ]
                ],
                'sample_executions' => [
                    [
                        'execution_id' => 'exec_demo_1',
                        'status' => 'completed',
                        'started_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
                        'actions_successful' => 3,
                        'actions_failed' => 0
                    ]
                ]
            ]
        ];
    }
}
