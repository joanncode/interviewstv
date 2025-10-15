<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Payment Gateway Service
 * 
 * Handles payment processing, gateway connections, and financial operations including:
 * - Payment provider management and discovery
 * - Payment method registration and verification
 * - Transaction processing and monitoring
 * - Subscription billing and management
 * - Webhook handling and event processing
 * - Analytics and financial reporting
 * - Fraud detection and risk management
 */
class PaymentGatewayService
{
    private PDO $db;
    private string $encryptionKey;
    
    // Supported payment providers
    private array $supportedProviders = [
        'stripe', 'paypal', 'square', 'adyen', 'braintree', 'razorpay'
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->encryptionKey = $_ENV['ENCRYPTION_KEY'] ?? 'demo_key_for_development_only';
    }

    // ==================== PROVIDER MANAGEMENT ====================

    /**
     * Get available payment providers
     */
    public function getAvailableProviders(array $options = []): array
    {
        try {
            $providerType = $options['provider_type'] ?? null;
            $currency = $options['currency'] ?? null;
            $country = $options['country'] ?? null;
            $features = $options['features'] ?? [];
            $search = $options['search'] ?? null;

            $sql = "SELECT * FROM payment_providers WHERE is_active = 1";
            $params = [];

            if ($providerType) {
                $sql .= " AND provider_type = :provider_type";
                $params['provider_type'] = $providerType;
            }

            if ($search) {
                $sql .= " AND (provider_name LIKE :search OR description LIKE :search)";
                $params['search'] = '%' . $search . '%';
            }

            $sql .= " ORDER BY provider_name";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $providers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields and apply additional filters
            foreach ($providers as &$provider) {
                $provider['supported_currencies'] = json_decode($provider['supported_currencies'] ?? '[]', true);
                $provider['supported_countries'] = json_decode($provider['supported_countries'] ?? '[]', true);
                $provider['features'] = json_decode($provider['features'] ?? '[]', true);
                $provider['oauth_scopes'] = json_decode($provider['oauth_scopes'] ?? '[]', true);

                // Apply currency filter
                if ($currency && !in_array($currency, $provider['supported_currencies'])) {
                    continue;
                }

                // Apply country filter
                if ($country && !in_array($country, $provider['supported_countries'])) {
                    continue;
                }

                // Apply features filter
                if (!empty($features)) {
                    $hasAllFeatures = true;
                    foreach ($features as $feature) {
                        if (!in_array($feature, $provider['features'])) {
                            $hasAllFeatures = false;
                            break;
                        }
                    }
                    if (!$hasAllFeatures) {
                        continue;
                    }
                }
            }

            return [
                'success' => true,
                'data' => array_values($providers)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get payment providers: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get specific provider details
     */
    public function getProviderDetails(string $providerId): array
    {
        try {
            $stmt = $this->db->prepare("SELECT * FROM payment_providers WHERE provider_id = :provider_id AND is_active = 1");
            $stmt->execute(['provider_id' => $providerId]);
            $provider = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$provider) {
                return [
                    'success' => false,
                    'message' => 'Payment provider not found'
                ];
            }

            // Parse JSON fields
            $provider['supported_currencies'] = json_decode($provider['supported_currencies'] ?? '[]', true);
            $provider['supported_countries'] = json_decode($provider['supported_countries'] ?? '[]', true);
            $provider['features'] = json_decode($provider['features'] ?? '[]', true);
            $provider['oauth_scopes'] = json_decode($provider['oauth_scopes'] ?? '[]', true);

            return [
                'success' => true,
                'data' => $provider
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get provider details: ' . $e->getMessage()
            ];
        }
    }

    // ==================== CONNECTION MANAGEMENT ====================

    /**
     * Get user's payment connections
     */
    public function getUserConnections(int $userId, array $options = []): array
    {
        try {
            $providerId = $options['provider_id'] ?? null;
            $status = $options['status'] ?? null;
            $environment = $options['environment'] ?? null;

            $sql = "SELECT c.*, p.provider_name, p.provider_type, p.logo_url 
                    FROM user_payment_connections c 
                    JOIN payment_providers p ON c.provider_id = p.provider_id 
                    WHERE c.user_id = :user_id AND c.is_active = 1";
            $params = ['user_id' => $userId];

            if ($providerId) {
                $sql .= " AND c.provider_id = :provider_id";
                $params['provider_id'] = $providerId;
            }

            if ($status) {
                $sql .= " AND c.connection_status = :status";
                $params['status'] = $status;
            }

            if ($environment) {
                $sql .= " AND c.environment = :environment";
                $params['environment'] = $environment;
            }

            $sql .= " ORDER BY c.is_default DESC, c.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields and decrypt sensitive data for display
            foreach ($connections as &$connection) {
                $connection['webhook_events'] = json_decode($connection['webhook_events'] ?? '[]', true);
                $connection['business_info'] = json_decode($connection['business_info'] ?? '{}', true);
                
                // Don't expose actual credentials, just indicate if they exist
                $connection['has_credentials'] = !empty($connection['api_credentials']);
                unset($connection['api_credentials']);
            }

            return [
                'success' => true,
                'data' => $connections
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get payment connections: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create payment gateway connection
     */
    public function createConnection(int $userId, string $providerId, array $connectionData): array
    {
        try {
            // Validate provider
            $provider = $this->getProviderDetails($providerId);
            if (!$provider['success']) {
                return $provider;
            }

            $connectionId = 'conn_' . uniqid();
            $connectionName = $connectionData['connection_name'] ?? $provider['data']['provider_name'] . ' Connection';
            $environment = $connectionData['environment'] ?? 'sandbox';
            $credentials = $connectionData['credentials'] ?? [];
            $businessInfo = $connectionData['business_info'] ?? [];

            // Encrypt credentials
            $encryptedCredentials = $this->encryptCredentials($credentials);

            $stmt = $this->db->prepare("
                INSERT INTO user_payment_connections (
                    connection_id, user_id, provider_id, connection_name, 
                    environment, api_credentials, default_currency, business_info
                ) VALUES (
                    :connection_id, :user_id, :provider_id, :connection_name,
                    :environment, :api_credentials, :default_currency, :business_info
                )
            ");

            $stmt->execute([
                'connection_id' => $connectionId,
                'user_id' => $userId,
                'provider_id' => $providerId,
                'connection_name' => $connectionName,
                'environment' => $environment,
                'api_credentials' => $encryptedCredentials,
                'default_currency' => $connectionData['default_currency'] ?? 'USD',
                'business_info' => json_encode($businessInfo)
            ]);

            return [
                'success' => true,
                'data' => [
                    'connection_id' => $connectionId,
                    'provider_name' => $provider['data']['provider_name'],
                    'environment' => $environment,
                    'status' => 'active'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create payment connection: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update payment connection
     */
    public function updateConnection(int $userId, string $connectionId, array $updateData): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Payment connection not found'
                ];
            }

            $allowedFields = [
                'connection_name', 'connection_status', 'default_currency', 
                'auto_capture', 'is_default', 'business_info'
            ];

            $updateFields = [];
            $params = ['connection_id' => $connectionId, 'user_id' => $userId];

            foreach ($updateData as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    if ($field === 'business_info') {
                        $value = json_encode($value);
                    }
                    $updateFields[] = "$field = :$field";
                    $params[$field] = $value;
                }
            }

            if (empty($updateFields)) {
                return [
                    'success' => false,
                    'message' => 'No valid fields to update'
                ];
            }

            $sql = "UPDATE user_payment_connections SET " . implode(', ', $updateFields) . 
                   ", updated_at = CURRENT_TIMESTAMP WHERE connection_id = :connection_id AND user_id = :user_id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            return [
                'success' => true,
                'message' => 'Payment connection updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to update payment connection: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete payment connection
     */
    public function deleteConnection(int $userId, string $connectionId): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Payment connection not found'
                ];
            }

            // Soft delete by setting is_active to 0
            $stmt = $this->db->prepare("
                UPDATE user_payment_connections 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE connection_id = :connection_id AND user_id = :user_id
            ");
            $stmt->execute(['connection_id' => $connectionId, 'user_id' => $userId]);

            return [
                'success' => true,
                'message' => 'Payment connection deleted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to delete payment connection: ' . $e->getMessage()
            ];
        }
    }

    // ==================== PAYMENT METHODS ====================

    /**
     * Add payment method
     */
    public function addPaymentMethod(int $userId, string $connectionId, array $methodData): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Payment connection not found'
                ];
            }

            $methodId = 'pm_' . uniqid();
            $methodType = $methodData['method_type'] ?? 'card';
            $customerId = $methodData['customer_id'] ?? null;
            $providerMethodId = $methodData['provider_method_id'] ?? null;

            // Tokenize/mask sensitive payment method data
            $tokenizedData = $this->tokenizePaymentMethodData($methodData['method_data'] ?? []);
            $billingAddress = $methodData['billing_address'] ?? [];

            $stmt = $this->db->prepare("
                INSERT INTO payment_methods (
                    method_id, user_id, connection_id, customer_id, method_type,
                    provider_method_id, method_data, billing_address, is_default
                ) VALUES (
                    :method_id, :user_id, :connection_id, :customer_id, :method_type,
                    :provider_method_id, :method_data, :billing_address, :is_default
                )
            ");

            $stmt->execute([
                'method_id' => $methodId,
                'user_id' => $userId,
                'connection_id' => $connectionId,
                'customer_id' => $customerId,
                'method_type' => $methodType,
                'provider_method_id' => $providerMethodId,
                'method_data' => json_encode($tokenizedData),
                'billing_address' => json_encode($billingAddress),
                'is_default' => $methodData['is_default'] ?? 0
            ]);

            return [
                'success' => true,
                'data' => [
                    'method_id' => $methodId,
                    'method_type' => $methodType,
                    'is_verified' => false,
                    'masked_data' => $this->getMaskedMethodData($tokenizedData)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to add payment method: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user's payment methods
     */
    public function getPaymentMethods(int $userId, string $connectionId = null): array
    {
        try {
            $sql = "SELECT m.*, c.provider_id, p.provider_name
                    FROM payment_methods m
                    JOIN user_payment_connections c ON m.connection_id = c.connection_id
                    JOIN payment_providers p ON c.provider_id = p.provider_id
                    WHERE m.user_id = :user_id AND m.is_active = 1";
            $params = ['user_id' => $userId];

            if ($connectionId) {
                $sql .= " AND m.connection_id = :connection_id";
                $params['connection_id'] = $connectionId;
            }

            $sql .= " ORDER BY m.is_default DESC, m.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields and mask sensitive data
            foreach ($methods as &$method) {
                $methodData = json_decode($method['method_data'] ?? '{}', true);
                $method['method_data'] = $this->getMaskedMethodData($methodData);
                $method['billing_address'] = json_decode($method['billing_address'] ?? '{}', true);
            }

            return [
                'success' => true,
                'data' => $methods
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get payment methods: ' . $e->getMessage()
            ];
        }
    }

    // ==================== TRANSACTION PROCESSING ====================

    /**
     * Process payment
     */
    public function processPayment(int $userId, array $paymentData): array
    {
        try {
            $connectionId = $paymentData['connection_id'];
            $methodId = $paymentData['method_id'] ?? null;
            $amount = $paymentData['amount'];
            $currency = $paymentData['currency'] ?? 'USD';
            $description = $paymentData['description'] ?? '';
            $metadata = $paymentData['metadata'] ?? [];

            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Payment connection not found'
                ];
            }

            // Validate payment method if provided
            if ($methodId) {
                $method = $this->getPaymentMethodDetails($methodId, $userId);
                if (!$method) {
                    return [
                        'success' => false,
                        'message' => 'Payment method not found'
                    ];
                }
            }

            $transactionId = 'txn_' . uniqid();
            $providerTransactionId = 'provider_' . uniqid(); // Mock provider ID

            // Calculate fees
            $feeAmount = $this->calculateTransactionFee($connection, $amount);
            $netAmount = $amount - $feeAmount;

            // Create transaction record
            $stmt = $this->db->prepare("
                INSERT INTO payment_transactions (
                    transaction_id, user_id, connection_id, method_id, provider_transaction_id,
                    transaction_type, amount, currency, fee_amount, net_amount, description,
                    metadata, payment_source, reference_id, risk_score, risk_level
                ) VALUES (
                    :transaction_id, :user_id, :connection_id, :method_id, :provider_transaction_id,
                    'payment', :amount, :currency, :fee_amount, :net_amount, :description,
                    :metadata, :payment_source, :reference_id, :risk_score, :risk_level
                )
            ");

            $stmt->execute([
                'transaction_id' => $transactionId,
                'user_id' => $userId,
                'connection_id' => $connectionId,
                'method_id' => $methodId,
                'provider_transaction_id' => $providerTransactionId,
                'amount' => $amount,
                'currency' => $currency,
                'fee_amount' => $feeAmount,
                'net_amount' => $netAmount,
                'description' => $description,
                'metadata' => json_encode($metadata),
                'payment_source' => $paymentData['payment_source'] ?? 'interview',
                'reference_id' => $paymentData['reference_id'] ?? null,
                'risk_score' => $this->calculateRiskScore($paymentData),
                'risk_level' => $this->determineRiskLevel($paymentData)
            ]);

            // Simulate payment processing
            $success = $this->simulatePaymentProcessing($connection, $amount);

            if ($success) {
                // Update transaction status
                $this->updateTransactionStatus($transactionId, 'succeeded', [
                    'captured_at' => date('Y-m-d H:i:s')
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'transaction_id' => $transactionId,
                        'provider_transaction_id' => $providerTransactionId,
                        'status' => 'succeeded',
                        'amount' => $amount,
                        'currency' => $currency,
                        'fee_amount' => $feeAmount,
                        'net_amount' => $netAmount
                    ]
                ];
            } else {
                // Update transaction status
                $this->updateTransactionStatus($transactionId, 'failed', [
                    'failed_at' => date('Y-m-d H:i:s'),
                    'failure_reason' => 'Payment declined by provider',
                    'failure_code' => 'card_declined'
                ]);

                return [
                    'success' => false,
                    'message' => 'Payment was declined',
                    'data' => [
                        'transaction_id' => $transactionId,
                        'failure_code' => 'card_declined'
                    ]
                ];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get transaction details
     */
    public function getTransaction(int $userId, string $transactionId): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT t.*, c.provider_id, p.provider_name, m.method_type
                FROM payment_transactions t
                JOIN user_payment_connections c ON t.connection_id = c.connection_id
                JOIN payment_providers p ON c.provider_id = p.provider_id
                LEFT JOIN payment_methods m ON t.method_id = m.method_id
                WHERE t.transaction_id = :transaction_id AND t.user_id = :user_id
            ");
            $stmt->execute(['transaction_id' => $transactionId, 'user_id' => $userId]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$transaction) {
                return [
                    'success' => false,
                    'message' => 'Transaction not found'
                ];
            }

            // Parse JSON fields
            $transaction['metadata'] = json_decode($transaction['metadata'] ?? '{}', true);
            $transaction['customer_info'] = json_decode($transaction['customer_info'] ?? '{}', true);
            $transaction['billing_address'] = json_decode($transaction['billing_address'] ?? '{}', true);
            $transaction['shipping_address'] = json_decode($transaction['shipping_address'] ?? '{}', true);

            return [
                'success' => true,
                'data' => $transaction
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get transaction: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user's transactions
     */
    public function getUserTransactions(int $userId, array $options = []): array
    {
        try {
            $connectionId = $options['connection_id'] ?? null;
            $status = $options['status'] ?? null;
            $type = $options['type'] ?? null;
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;

            $sql = "SELECT t.*, c.provider_id, p.provider_name, m.method_type
                    FROM payment_transactions t
                    JOIN user_payment_connections c ON t.connection_id = c.connection_id
                    JOIN payment_providers p ON c.provider_id = p.provider_id
                    LEFT JOIN payment_methods m ON t.method_id = m.method_id
                    WHERE t.user_id = :user_id";
            $params = ['user_id' => $userId];

            if ($connectionId) {
                $sql .= " AND t.connection_id = :connection_id";
                $params['connection_id'] = $connectionId;
            }

            if ($status) {
                $sql .= " AND t.transaction_status = :status";
                $params['status'] = $status;
            }

            if ($type) {
                $sql .= " AND t.transaction_type = :type";
                $params['type'] = $type;
            }

            $sql .= " ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset";
            $params['limit'] = $limit;
            $params['offset'] = $offset;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($transactions as &$transaction) {
                $transaction['metadata'] = json_decode($transaction['metadata'] ?? '{}', true);
            }

            return [
                'success' => true,
                'data' => $transactions
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get transactions: ' . $e->getMessage()
            ];
        }
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    /**
     * Create subscription plan
     */
    public function createSubscriptionPlan(int $userId, string $connectionId, array $planData): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'Payment connection not found'
                ];
            }

            $planId = 'plan_' . uniqid();
            $providerPlanId = 'provider_plan_' . uniqid(); // Mock provider plan ID

            $stmt = $this->db->prepare("
                INSERT INTO subscription_plans (
                    plan_id, user_id, connection_id, provider_plan_id, plan_name,
                    plan_description, plan_type, billing_interval, billing_interval_count,
                    amount, currency, setup_fee, trial_period_days, features, limits_config
                ) VALUES (
                    :plan_id, :user_id, :connection_id, :provider_plan_id, :plan_name,
                    :plan_description, :plan_type, :billing_interval, :billing_interval_count,
                    :amount, :currency, :setup_fee, :trial_period_days, :features, :limits_config
                )
            ");

            $stmt->execute([
                'plan_id' => $planId,
                'user_id' => $userId,
                'connection_id' => $connectionId,
                'provider_plan_id' => $providerPlanId,
                'plan_name' => $planData['plan_name'],
                'plan_description' => $planData['plan_description'] ?? '',
                'plan_type' => $planData['plan_type'] ?? 'recurring',
                'billing_interval' => $planData['billing_interval'] ?? 'monthly',
                'billing_interval_count' => $planData['billing_interval_count'] ?? 1,
                'amount' => $planData['amount'],
                'currency' => $planData['currency'] ?? 'USD',
                'setup_fee' => $planData['setup_fee'] ?? 0.00,
                'trial_period_days' => $planData['trial_period_days'] ?? 0,
                'features' => json_encode($planData['features'] ?? []),
                'limits_config' => json_encode($planData['limits_config'] ?? [])
            ]);

            return [
                'success' => true,
                'data' => [
                    'plan_id' => $planId,
                    'provider_plan_id' => $providerPlanId,
                    'plan_name' => $planData['plan_name'],
                    'amount' => $planData['amount'],
                    'currency' => $planData['currency'] ?? 'USD'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create subscription plan: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Subscribe customer to plan
     */
    public function createSubscription(int $userId, array $subscriptionData): array
    {
        try {
            $planId = $subscriptionData['plan_id'];
            $methodId = $subscriptionData['method_id'];
            $customerId = $subscriptionData['customer_id'] ?? null;

            // Validate plan
            $stmt = $this->db->prepare("SELECT * FROM subscription_plans WHERE plan_id = :plan_id AND user_id = :user_id");
            $stmt->execute(['plan_id' => $planId, 'user_id' => $userId]);
            $plan = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$plan) {
                return [
                    'success' => false,
                    'message' => 'Subscription plan not found'
                ];
            }

            // Validate payment method
            $method = $this->getPaymentMethodDetails($methodId, $userId);
            if (!$method) {
                return [
                    'success' => false,
                    'message' => 'Payment method not found'
                ];
            }

            $subscriptionId = 'sub_' . uniqid();
            $providerSubscriptionId = 'provider_sub_' . uniqid(); // Mock provider subscription ID

            $currentPeriodStart = new \DateTime();
            $currentPeriodEnd = clone $currentPeriodStart;

            // Calculate billing period
            $interval = $plan['billing_interval'];
            $intervalCount = $plan['billing_interval_count'];

            switch ($interval) {
                case 'daily':
                    $currentPeriodEnd->add(new \DateInterval("P{$intervalCount}D"));
                    break;
                case 'weekly':
                    $currentPeriodEnd->add(new \DateInterval("P" . ($intervalCount * 7) . "D"));
                    break;
                case 'monthly':
                    $currentPeriodEnd->add(new \DateInterval("P{$intervalCount}M"));
                    break;
                case 'quarterly':
                    $currentPeriodEnd->add(new \DateInterval("P" . ($intervalCount * 3) . "M"));
                    break;
                case 'yearly':
                    $currentPeriodEnd->add(new \DateInterval("P{$intervalCount}Y"));
                    break;
            }

            $stmt = $this->db->prepare("
                INSERT INTO customer_subscriptions (
                    subscription_id, user_id, connection_id, plan_id, method_id,
                    provider_subscription_id, customer_id, current_period_start,
                    current_period_end, next_billing_date, metadata
                ) VALUES (
                    :subscription_id, :user_id, :connection_id, :plan_id, :method_id,
                    :provider_subscription_id, :customer_id, :current_period_start,
                    :current_period_end, :next_billing_date, :metadata
                )
            ");

            $stmt->execute([
                'subscription_id' => $subscriptionId,
                'user_id' => $userId,
                'connection_id' => $plan['connection_id'],
                'plan_id' => $planId,
                'method_id' => $methodId,
                'provider_subscription_id' => $providerSubscriptionId,
                'customer_id' => $customerId,
                'current_period_start' => $currentPeriodStart->format('Y-m-d H:i:s'),
                'current_period_end' => $currentPeriodEnd->format('Y-m-d H:i:s'),
                'next_billing_date' => $currentPeriodEnd->format('Y-m-d H:i:s'),
                'metadata' => json_encode($subscriptionData['metadata'] ?? [])
            ]);

            return [
                'success' => true,
                'data' => [
                    'subscription_id' => $subscriptionId,
                    'provider_subscription_id' => $providerSubscriptionId,
                    'status' => 'active',
                    'current_period_start' => $currentPeriodStart->format('Y-m-d H:i:s'),
                    'current_period_end' => $currentPeriodEnd->format('Y-m-d H:i:s'),
                    'next_billing_date' => $currentPeriodEnd->format('Y-m-d H:i:s')
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create subscription: ' . $e->getMessage()
            ];
        }
    }

    // ==================== ANALYTICS & REPORTING ====================

    /**
     * Get payment analytics
     */
    public function getPaymentAnalytics(int $userId, array $options = []): array
    {
        try {
            $connectionId = $options['connection_id'] ?? null;
            $startDate = $options['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $options['end_date'] ?? date('Y-m-d');
            $groupBy = $options['group_by'] ?? 'day';

            $sql = "SELECT
                        date_period,
                        SUM(total_transactions) as total_transactions,
                        SUM(successful_transactions) as successful_transactions,
                        SUM(failed_transactions) as failed_transactions,
                        SUM(total_volume) as total_volume,
                        SUM(successful_volume) as successful_volume,
                        SUM(fee_volume) as fee_volume,
                        SUM(net_volume) as net_volume,
                        AVG(conversion_rate) as avg_conversion_rate
                    FROM payment_analytics
                    WHERE user_id = :user_id
                    AND date_period BETWEEN :start_date AND :end_date";
            $params = [
                'user_id' => $userId,
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if ($connectionId) {
                $sql .= " AND connection_id = :connection_id";
                $params['connection_id'] = $connectionId;
            }

            $sql .= " GROUP BY date_period ORDER BY date_period";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate summary metrics
            $summary = [
                'total_transactions' => array_sum(array_column($analytics, 'total_transactions')),
                'successful_transactions' => array_sum(array_column($analytics, 'successful_transactions')),
                'failed_transactions' => array_sum(array_column($analytics, 'failed_transactions')),
                'total_volume' => array_sum(array_column($analytics, 'total_volume')),
                'successful_volume' => array_sum(array_column($analytics, 'successful_volume')),
                'fee_volume' => array_sum(array_column($analytics, 'fee_volume')),
                'net_volume' => array_sum(array_column($analytics, 'net_volume')),
                'avg_conversion_rate' => count($analytics) > 0 ? array_sum(array_column($analytics, 'avg_conversion_rate')) / count($analytics) : 0
            ];

            return [
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'daily_data' => $analytics,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'group_by' => $groupBy
                    ]
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get payment analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Process webhook event
     */
    public function processWebhook(string $connectionId, array $webhookData): array
    {
        try {
            $webhookId = 'wh_' . uniqid();
            $eventType = $webhookData['event_type'] ?? 'unknown';
            $eventData = $webhookData['event_data'] ?? [];
            $signature = $webhookData['signature'] ?? '';

            // Store webhook for processing
            $stmt = $this->db->prepare("
                INSERT INTO payment_webhooks (
                    webhook_id, connection_id, event_type, event_data, webhook_signature
                ) VALUES (
                    :webhook_id, :connection_id, :event_type, :event_data, :webhook_signature
                )
            ");

            $stmt->execute([
                'webhook_id' => $webhookId,
                'connection_id' => $connectionId,
                'event_type' => $eventType,
                'event_data' => json_encode($eventData),
                'webhook_signature' => $signature
            ]);

            // Process webhook based on event type
            $this->handleWebhookEvent($webhookId, $eventType, $eventData);

            return [
                'success' => true,
                'data' => [
                    'webhook_id' => $webhookId,
                    'status' => 'processed'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to process webhook: ' . $e->getMessage()
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
                    'provider_id' => 'stripe',
                    'provider_name' => 'Stripe',
                    'provider_type' => 'credit_card',
                    'logo_url' => 'https://via.placeholder.com/60x60/635BFF/FFFFFF?text=ST',
                    'features' => ['credit_cards', 'subscriptions', 'marketplace', 'fraud_detection'],
                    'transaction_fee_percentage' => 2.9,
                    'transaction_fee_fixed' => 0.30,
                    'is_connected' => false
                ],
                [
                    'provider_id' => 'paypal',
                    'provider_name' => 'PayPal',
                    'provider_type' => 'digital_wallet',
                    'logo_url' => 'https://via.placeholder.com/60x60/0070BA/FFFFFF?text=PP',
                    'features' => ['paypal_wallet', 'credit_cards', 'buyer_protection'],
                    'transaction_fee_percentage' => 3.49,
                    'transaction_fee_fixed' => 0.49,
                    'is_connected' => true
                ]
            ],
            'connections' => [
                [
                    'connection_id' => 'conn_demo_paypal',
                    'provider_name' => 'PayPal',
                    'connection_name' => 'Main PayPal Account',
                    'environment' => 'sandbox',
                    'connection_status' => 'active',
                    'default_currency' => 'USD',
                    'is_default' => true,
                    'connected_at' => '2024-01-15 10:30:00'
                ]
            ],
            'payment_methods' => [
                [
                    'method_id' => 'pm_demo_card',
                    'method_type' => 'card',
                    'provider_name' => 'PayPal',
                    'masked_data' => [
                        'brand' => 'visa',
                        'last4' => '4242',
                        'exp_month' => 12,
                        'exp_year' => 2025
                    ],
                    'is_default' => true,
                    'is_verified' => true,
                    'created_at' => '2024-01-15 10:35:00'
                ]
            ],
            'transactions' => [
                [
                    'transaction_id' => 'txn_demo_001',
                    'provider_name' => 'PayPal',
                    'transaction_type' => 'payment',
                    'transaction_status' => 'succeeded',
                    'amount' => 99.00,
                    'currency' => 'USD',
                    'fee_amount' => 3.17,
                    'net_amount' => 95.83,
                    'description' => 'Interview session payment',
                    'payment_source' => 'interview',
                    'created_at' => '2024-01-20 14:30:00'
                ],
                [
                    'transaction_id' => 'txn_demo_002',
                    'provider_name' => 'PayPal',
                    'transaction_type' => 'payment',
                    'transaction_status' => 'failed',
                    'amount' => 149.00,
                    'currency' => 'USD',
                    'fee_amount' => 0.00,
                    'net_amount' => 0.00,
                    'description' => 'Premium interview package',
                    'failure_reason' => 'Insufficient funds',
                    'payment_source' => 'subscription',
                    'created_at' => '2024-01-19 09:15:00'
                ]
            ],
            'subscription_plans' => [
                [
                    'plan_id' => 'plan_demo_basic',
                    'plan_name' => 'Basic Interview Plan',
                    'plan_description' => 'Up to 10 interviews per month',
                    'billing_interval' => 'monthly',
                    'amount' => 29.99,
                    'currency' => 'USD',
                    'trial_period_days' => 7,
                    'is_active' => true
                ],
                [
                    'plan_id' => 'plan_demo_pro',
                    'plan_name' => 'Professional Interview Plan',
                    'plan_description' => 'Unlimited interviews with advanced features',
                    'billing_interval' => 'monthly',
                    'amount' => 99.99,
                    'currency' => 'USD',
                    'trial_period_days' => 14,
                    'is_active' => true
                ]
            ],
            'analytics' => [
                'summary' => [
                    'total_transactions' => 156,
                    'successful_transactions' => 142,
                    'failed_transactions' => 14,
                    'total_volume' => 15420.50,
                    'successful_volume' => 14180.25,
                    'fee_volume' => 453.20,
                    'net_volume' => 13727.05,
                    'avg_conversion_rate' => 91.03
                ],
                'monthly_revenue' => [
                    ['month' => '2024-01', 'revenue' => 4250.75, 'transactions' => 45],
                    ['month' => '2024-02', 'revenue' => 5180.25, 'transactions' => 52],
                    ['month' => '2024-03', 'revenue' => 4749.25, 'transactions' => 59]
                ]
            ]
        ];
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get connection details
     */
    private function getConnectionDetails(string $connectionId, int $userId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM user_payment_connections
            WHERE connection_id = :connection_id AND user_id = :user_id AND is_active = 1
        ");
        $stmt->execute(['connection_id' => $connectionId, 'user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get payment method details
     */
    private function getPaymentMethodDetails(string $methodId, int $userId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM payment_methods
            WHERE method_id = :method_id AND user_id = :user_id AND is_active = 1
        ");
        $stmt->execute(['method_id' => $methodId, 'user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Encrypt credentials for storage
     */
    private function encryptCredentials(array $credentials): string
    {
        // In production, use proper encryption (AES-256-CBC)
        // For demo purposes, using base64 encoding
        return base64_encode(json_encode($credentials));
    }

    /**
     * Decrypt credentials from storage
     */
    private function decryptCredentials(string $encryptedCredentials): array
    {
        // In production, use proper decryption
        // For demo purposes, using base64 decoding
        $decoded = base64_decode($encryptedCredentials);
        return json_decode($decoded, true) ?: [];
    }

    /**
     * Tokenize payment method data
     */
    private function tokenizePaymentMethodData(array $methodData): array
    {
        // In production, tokenize sensitive data with payment processor
        // For demo purposes, mask sensitive information
        $tokenized = $methodData;

        if (isset($tokenized['card_number'])) {
            $tokenized['card_number'] = '**** **** **** ' . substr($tokenized['card_number'], -4);
        }

        if (isset($tokenized['cvv'])) {
            unset($tokenized['cvv']); // Never store CVV
        }

        return $tokenized;
    }

    /**
     * Get masked payment method data for display
     */
    private function getMaskedMethodData(array $methodData): array
    {
        $masked = $methodData;

        // Additional masking for display
        if (isset($masked['account_number'])) {
            $masked['account_number'] = '**** **** ' . substr($masked['account_number'], -4);
        }

        return $masked;
    }

    /**
     * Calculate transaction fee
     */
    private function calculateTransactionFee(array $connection, float $amount): float
    {
        // Get provider fee structure
        $stmt = $this->db->prepare("
            SELECT transaction_fee_percentage, transaction_fee_fixed
            FROM payment_providers
            WHERE provider_id = :provider_id
        ");
        $stmt->execute(['provider_id' => $connection['provider_id']]);
        $provider = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$provider) {
            return 0.00;
        }

        $percentageFee = $amount * ($provider['transaction_fee_percentage'] / 100);
        $fixedFee = $provider['transaction_fee_fixed'];

        return round($percentageFee + $fixedFee, 2);
    }

    /**
     * Calculate risk score for transaction
     */
    private function calculateRiskScore(array $paymentData): int
    {
        $riskScore = 0;

        // Amount-based risk
        $amount = $paymentData['amount'] ?? 0;
        if ($amount > 1000) $riskScore += 20;
        if ($amount > 5000) $riskScore += 30;

        // Frequency-based risk (simplified)
        $riskScore += rand(0, 20);

        return min($riskScore, 100);
    }

    /**
     * Determine risk level from score
     */
    private function determineRiskLevel(array $paymentData): string
    {
        $score = $this->calculateRiskScore($paymentData);

        if ($score >= 80) return 'highest';
        if ($score >= 60) return 'elevated';
        if ($score >= 30) return 'normal';
        return 'low';
    }

    /**
     * Simulate payment processing
     */
    private function simulatePaymentProcessing(array $connection, float $amount): bool
    {
        // Simulate payment success/failure
        // In production, this would call the actual payment processor API

        // Higher amounts have slightly higher failure rate
        $failureRate = $amount > 1000 ? 0.15 : 0.05;

        return rand(0, 100) / 100 > $failureRate;
    }

    /**
     * Update transaction status
     */
    private function updateTransactionStatus(string $transactionId, string $status, array $additionalData = []): void
    {
        $updateFields = ['transaction_status = :status', 'updated_at = CURRENT_TIMESTAMP'];
        $params = ['transaction_id' => $transactionId, 'status' => $status];

        foreach ($additionalData as $field => $value) {
            $updateFields[] = "$field = :$field";
            $params[$field] = $value;
        }

        $sql = "UPDATE payment_transactions SET " . implode(', ', $updateFields) .
               " WHERE transaction_id = :transaction_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    /**
     * Handle webhook event processing
     */
    private function handleWebhookEvent(string $webhookId, string $eventType, array $eventData): void
    {
        try {
            // Update webhook status to processing
            $stmt = $this->db->prepare("
                UPDATE payment_webhooks
                SET processing_status = 'processing', updated_at = CURRENT_TIMESTAMP
                WHERE webhook_id = :webhook_id
            ");
            $stmt->execute(['webhook_id' => $webhookId]);

            // Process based on event type
            switch ($eventType) {
                case 'payment.succeeded':
                    $this->handlePaymentSucceeded($eventData);
                    break;
                case 'payment.failed':
                    $this->handlePaymentFailed($eventData);
                    break;
                case 'subscription.created':
                    $this->handleSubscriptionCreated($eventData);
                    break;
                case 'subscription.cancelled':
                    $this->handleSubscriptionCancelled($eventData);
                    break;
                default:
                    // Log unknown event type
                    break;
            }

            // Update webhook status to processed
            $stmt = $this->db->prepare("
                UPDATE payment_webhooks
                SET processing_status = 'processed', processed_at = CURRENT_TIMESTAMP
                WHERE webhook_id = :webhook_id
            ");
            $stmt->execute(['webhook_id' => $webhookId]);

        } catch (Exception $e) {
            // Update webhook status to failed
            $stmt = $this->db->prepare("
                UPDATE payment_webhooks
                SET processing_status = 'failed', error_message = :error_message
                WHERE webhook_id = :webhook_id
            ");
            $stmt->execute(['webhook_id' => $webhookId, 'error_message' => $e->getMessage()]);
        }
    }

    /**
     * Handle payment succeeded webhook
     */
    private function handlePaymentSucceeded(array $eventData): void
    {
        // Update transaction status and trigger any necessary actions
        $transactionId = $eventData['transaction_id'] ?? null;
        if ($transactionId) {
            $this->updateTransactionStatus($transactionId, 'succeeded', [
                'captured_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    /**
     * Handle payment failed webhook
     */
    private function handlePaymentFailed(array $eventData): void
    {
        // Update transaction status and handle failure
        $transactionId = $eventData['transaction_id'] ?? null;
        if ($transactionId) {
            $this->updateTransactionStatus($transactionId, 'failed', [
                'failed_at' => date('Y-m-d H:i:s'),
                'failure_reason' => $eventData['failure_reason'] ?? 'Payment failed',
                'failure_code' => $eventData['failure_code'] ?? 'unknown'
            ]);
        }
    }

    /**
     * Handle subscription created webhook
     */
    private function handleSubscriptionCreated(array $eventData): void
    {
        // Process subscription creation
        $subscriptionId = $eventData['subscription_id'] ?? null;
        if ($subscriptionId) {
            // Update subscription status or trigger welcome actions
        }
    }

    /**
     * Handle subscription cancelled webhook
     */
    private function handleSubscriptionCancelled(array $eventData): void
    {
        // Process subscription cancellation
        $subscriptionId = $eventData['subscription_id'] ?? null;
        if ($subscriptionId) {
            $stmt = $this->db->prepare("
                UPDATE customer_subscriptions
                SET subscription_status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                WHERE provider_subscription_id = :subscription_id
            ");
            $stmt->execute(['subscription_id' => $subscriptionId]);
        }
    }
}
