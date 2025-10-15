<?php

namespace App\Controllers;

use App\Services\PaymentGatewayService;
use PDO;

/**
 * Payment Gateway Controller
 * 
 * REST API endpoints for payment processing and gateway management including:
 * - Payment provider discovery and management
 * - Payment method registration and verification
 * - Transaction processing and monitoring
 * - Subscription billing and management
 * - Webhook handling and event processing
 * - Analytics and financial reporting
 */
class PaymentGatewayController
{
    private PaymentGatewayService $paymentService;

    public function __construct(PDO $db)
    {
        $this->paymentService = new PaymentGatewayService($db);
    }

    // ==================== PROVIDER MANAGEMENT ====================

    /**
     * GET /api/payment/providers
     * Get available payment providers
     */
    public function getProviders(): void
    {
        try {
            $options = [
                'provider_type' => $_GET['provider_type'] ?? null,
                'currency' => $_GET['currency'] ?? null,
                'country' => $_GET['country'] ?? null,
                'features' => isset($_GET['features']) ? explode(',', $_GET['features']) : [],
                'search' => $_GET['search'] ?? null
            ];

            $result = $this->paymentService->getAvailableProviders($options);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/payment/providers/details
     * Get specific provider details
     */
    public function getProviderDetails(): void
    {
        try {
            $providerId = $_GET['provider_id'] ?? '';
            
            if (empty($providerId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Provider ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->getProviderDetails($providerId);
            
            http_response_code($result['success'] ? 200 : 404);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    // ==================== CONNECTION MANAGEMENT ====================

    /**
     * GET /api/payment/connections
     * Get user's payment connections
     */
    public function getConnections(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            
            $options = [
                'provider_id' => $_GET['provider_id'] ?? null,
                'status' => $_GET['status'] ?? null,
                'environment' => $_GET['environment'] ?? null
            ];

            $result = $this->paymentService->getUserConnections($userId, $options);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/payment/connections
     * Create new payment connection
     */
    public function createConnection(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $input = json_decode(file_get_contents('php://input'), true);
            
            $providerId = $input['provider_id'] ?? '';
            $connectionData = $input['connection_data'] ?? [];
            
            if (empty($providerId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Provider ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->createConnection($userId, $providerId, $connectionData);
            
            http_response_code($result['success'] ? 201 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * PUT /api/payment/connections/{connection_id}
     * Update payment connection
     */
    public function updateConnection(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $connectionId = $_GET['connection_id'] ?? '';
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($connectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->updateConnection($userId, $connectionId, $input);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * DELETE /api/payment/connections/{connection_id}
     * Delete payment connection
     */
    public function deleteConnection(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $connectionId = $_GET['connection_id'] ?? '';
            
            if (empty($connectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->deleteConnection($userId, $connectionId);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    // ==================== PAYMENT METHODS ====================

    /**
     * GET /api/payment/methods
     * Get user's payment methods
     */
    public function getPaymentMethods(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $connectionId = $_GET['connection_id'] ?? null;

            $result = $this->paymentService->getPaymentMethods($userId, $connectionId);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/payment/methods
     * Add new payment method
     */
    public function addPaymentMethod(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $input = json_decode(file_get_contents('php://input'), true);
            
            $connectionId = $input['connection_id'] ?? '';
            $methodData = $input['method_data'] ?? [];
            
            if (empty($connectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->addPaymentMethod($userId, $connectionId, $methodData);
            
            http_response_code($result['success'] ? 201 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/payment/transactions/{transaction_id}
     * Get transaction details
     */
    public function getTransaction(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $transactionId = $_GET['transaction_id'] ?? '';

            if (empty($transactionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Transaction ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->getTransaction($userId, $transactionId);

            http_response_code($result['success'] ? 200 : 404);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/payment/transactions
     * Get user's transactions
     */
    public function getTransactions(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo

            $options = [
                'connection_id' => $_GET['connection_id'] ?? null,
                'status' => $_GET['status'] ?? null,
                'type' => $_GET['type'] ?? null,
                'limit' => isset($_GET['limit']) ? (int)$_GET['limit'] : 50,
                'offset' => isset($_GET['offset']) ? (int)$_GET['offset'] : 0
            ];

            $result = $this->paymentService->getUserTransactions($userId, $options);

            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    /**
     * POST /api/payment/subscription-plans
     * Create subscription plan
     */
    public function createSubscriptionPlan(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $input = json_decode(file_get_contents('php://input'), true);

            $connectionId = $input['connection_id'] ?? '';
            $planData = $input['plan_data'] ?? [];

            if (empty($connectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->createSubscriptionPlan($userId, $connectionId, $planData);

            http_response_code($result['success'] ? 201 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/payment/subscriptions
     * Create customer subscription
     */
    public function createSubscription(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo
            $input = json_decode(file_get_contents('php://input'), true);

            $requiredFields = ['plan_id', 'method_id'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    http_response_code(400);
                    header('Content-Type: application/json');
                    echo json_encode([
                        'success' => false,
                        'message' => ucfirst($field) . ' is required'
                    ]);
                    return;
                }
            }

            $result = $this->paymentService->createSubscription($userId, $input);

            http_response_code($result['success'] ? 201 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    // ==================== ANALYTICS & REPORTING ====================

    /**
     * GET /api/payment/analytics
     * Get payment analytics
     */
    public function getAnalytics(): void
    {
        try {
            $userId = $_SESSION['user_id'] ?? 1; // Mock user ID for demo

            $options = [
                'connection_id' => $_GET['connection_id'] ?? null,
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d'),
                'group_by' => $_GET['group_by'] ?? 'day'
            ];

            $result = $this->paymentService->getPaymentAnalytics($userId, $options);

            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/payment/webhooks
     * Process webhook event
     */
    public function processWebhook(): void
    {
        try {
            $connectionId = $_GET['connection_id'] ?? '';
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($connectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ]);
                return;
            }

            $result = $this->paymentService->processWebhook($connectionId, $input);

            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/payment/demo-data
     * Get demo data for testing
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->paymentService->getDemoData();

            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => $result
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }
}
