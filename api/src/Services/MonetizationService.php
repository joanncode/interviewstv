<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Monetization Service for Creator Economy
 */
class MonetizationService
{
    private PDO $pdo;
    private array $config;
    private string $stripeSecretKey;
    private string $paypalClientId;
    private string $paypalClientSecret;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'stripe_secret_key' => $_ENV['STRIPE_SECRET_KEY'] ?? '',
            'paypal_client_id' => $_ENV['PAYPAL_CLIENT_ID'] ?? '',
            'paypal_client_secret' => $_ENV['PAYPAL_CLIENT_SECRET'] ?? '',
            'platform_fee_percentage' => 5.0, // 5% platform fee
            'min_payout_amount' => 50.00,
            'payout_schedule' => 'weekly', // weekly, monthly
            'supported_currencies' => ['USD', 'EUR', 'GBP', 'CAD'],
            'subscription_tiers' => [
                'basic' => ['price' => 4.99, 'features' => ['ad_free', 'early_access']],
                'premium' => ['price' => 9.99, 'features' => ['ad_free', 'early_access', 'exclusive_content', 'direct_messaging']],
                'vip' => ['price' => 19.99, 'features' => ['ad_free', 'early_access', 'exclusive_content', 'direct_messaging', 'priority_support', 'custom_badges']]
            ]
        ], $config);

        $this->stripeSecretKey = $this->config['stripe_secret_key'];
        $this->paypalClientId = $this->config['paypal_client_id'];
        $this->paypalClientSecret = $this->config['paypal_client_secret'];
    }

    /**
     * Create a subscription plan for a creator
     */
    public function createSubscriptionPlan(int $creatorId, array $planData): array
    {
        try {
            $planId = 'plan_' . bin2hex(random_bytes(8));
            
            // Validate plan data
            $this->validatePlanData($planData);
            
            // Create plan in database
            $stmt = $this->pdo->prepare("
                INSERT INTO subscription_plans (
                    id, creator_id, name, description, price, currency,
                    billing_interval, features, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            ");
            
            $stmt->execute([
                $planId,
                $creatorId,
                $planData['name'],
                $planData['description'],
                $planData['price'],
                $planData['currency'] ?? 'USD',
                $planData['billing_interval'] ?? 'monthly',
                json_encode($planData['features'] ?? [])
            ]);

            // Create Stripe product and price
            $stripeProduct = $this->createStripeProduct($planData);
            $stripePrice = $this->createStripePrice($stripeProduct['id'], $planData);

            // Update plan with Stripe IDs
            $stmt = $this->pdo->prepare("
                UPDATE subscription_plans 
                SET stripe_product_id = ?, stripe_price_id = ?
                WHERE id = ?
            ");
            $stmt->execute([$stripeProduct['id'], $stripePrice['id'], $planId]);

            return [
                'plan_id' => $planId,
                'stripe_product_id' => $stripeProduct['id'],
                'stripe_price_id' => $stripePrice['id'],
                'status' => 'active'
            ];

        } catch (Exception $e) {
            error_log("Failed to create subscription plan: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Subscribe user to a creator's plan
     */
    public function createSubscription(int $userId, string $planId, string $paymentMethodId): array
    {
        try {
            // Get plan details
            $plan = $this->getSubscriptionPlan($planId);
            if (!$plan) {
                throw new Exception('Subscription plan not found');
            }

            // Check if user already has active subscription to this creator
            $existingSubscription = $this->getUserSubscriptionToCreator($userId, $plan['creator_id']);
            if ($existingSubscription && $existingSubscription['status'] === 'active') {
                throw new Exception('User already has an active subscription to this creator');
            }

            // Create Stripe subscription
            $stripeSubscription = $this->createStripeSubscription($userId, $plan, $paymentMethodId);

            // Create subscription record
            $subscriptionId = 'sub_' . bin2hex(random_bytes(8));
            
            $stmt = $this->pdo->prepare("
                INSERT INTO subscriptions (
                    id, user_id, creator_id, plan_id, stripe_subscription_id,
                    status, current_period_start, current_period_end,
                    amount, currency, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $subscriptionId,
                $userId,
                $plan['creator_id'],
                $planId,
                $stripeSubscription['id'],
                $stripeSubscription['status'],
                date('Y-m-d H:i:s', $stripeSubscription['current_period_start']),
                date('Y-m-d H:i:s', $stripeSubscription['current_period_end']),
                $plan['price'],
                $plan['currency']
            ]);

            // Record transaction
            $this->recordTransaction([
                'subscription_id' => $subscriptionId,
                'user_id' => $userId,
                'creator_id' => $plan['creator_id'],
                'amount' => $plan['price'],
                'currency' => $plan['currency'],
                'type' => 'subscription',
                'status' => 'completed',
                'stripe_payment_intent_id' => $stripeSubscription['latest_invoice']
            ]);

            return [
                'subscription_id' => $subscriptionId,
                'status' => $stripeSubscription['status'],
                'current_period_end' => date('Y-m-d H:i:s', $stripeSubscription['current_period_end'])
            ];

        } catch (Exception $e) {
            error_log("Failed to create subscription: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process one-time tip/donation
     */
    public function processTip(int $fromUserId, int $toCreatorId, float $amount, string $currency = 'USD', string $message = ''): array
    {
        try {
            // Validate amount
            if ($amount < 1.00) {
                throw new Exception('Minimum tip amount is $1.00');
            }

            // Calculate platform fee
            $platformFee = $amount * ($this->config['platform_fee_percentage'] / 100);
            $creatorAmount = $amount - $platformFee;

            // Create payment intent with Stripe
            $paymentIntent = $this->createStripePaymentIntent($amount, $currency, [
                'from_user_id' => $fromUserId,
                'to_creator_id' => $toCreatorId,
                'type' => 'tip'
            ]);

            // Record transaction
            $transactionId = $this->recordTransaction([
                'user_id' => $fromUserId,
                'creator_id' => $toCreatorId,
                'amount' => $amount,
                'creator_amount' => $creatorAmount,
                'platform_fee' => $platformFee,
                'currency' => $currency,
                'type' => 'tip',
                'status' => 'pending',
                'message' => $message,
                'stripe_payment_intent_id' => $paymentIntent['id']
            ]);

            return [
                'transaction_id' => $transactionId,
                'payment_intent_id' => $paymentIntent['id'],
                'client_secret' => $paymentIntent['client_secret'],
                'amount' => $amount,
                'creator_amount' => $creatorAmount,
                'platform_fee' => $platformFee
            ];

        } catch (Exception $e) {
            error_log("Failed to process tip: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create paid content access
     */
    public function createPaidContent(int $creatorId, array $contentData): array
    {
        try {
            $contentId = 'content_' . bin2hex(random_bytes(8));
            
            $stmt = $this->pdo->prepare("
                INSERT INTO paid_content (
                    id, creator_id, title, description, content_type,
                    price, currency, access_duration, preview_content,
                    full_content, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            ");
            
            $stmt->execute([
                $contentId,
                $creatorId,
                $contentData['title'],
                $contentData['description'],
                $contentData['content_type'],
                $contentData['price'],
                $contentData['currency'] ?? 'USD',
                $contentData['access_duration'] ?? 30, // days
                $contentData['preview_content'] ?? '',
                $contentData['full_content']
            ]);

            return [
                'content_id' => $contentId,
                'status' => 'active'
            ];

        } catch (Exception $e) {
            error_log("Failed to create paid content: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Purchase access to paid content
     */
    public function purchaseContentAccess(int $userId, string $contentId, string $paymentMethodId): array
    {
        try {
            // Get content details
            $content = $this->getPaidContent($contentId);
            if (!$content) {
                throw new Exception('Content not found');
            }

            // Check if user already has access
            if ($this->userHasContentAccess($userId, $contentId)) {
                throw new Exception('User already has access to this content');
            }

            // Calculate fees
            $platformFee = $content['price'] * ($this->config['platform_fee_percentage'] / 100);
            $creatorAmount = $content['price'] - $platformFee;

            // Create payment intent
            $paymentIntent = $this->createStripePaymentIntent($content['price'], $content['currency'], [
                'user_id' => $userId,
                'content_id' => $contentId,
                'type' => 'content_purchase'
            ]);

            // Record transaction
            $transactionId = $this->recordTransaction([
                'user_id' => $userId,
                'creator_id' => $content['creator_id'],
                'content_id' => $contentId,
                'amount' => $content['price'],
                'creator_amount' => $creatorAmount,
                'platform_fee' => $platformFee,
                'currency' => $content['currency'],
                'type' => 'content_purchase',
                'status' => 'pending',
                'stripe_payment_intent_id' => $paymentIntent['id']
            ]);

            return [
                'transaction_id' => $transactionId,
                'payment_intent_id' => $paymentIntent['id'],
                'client_secret' => $paymentIntent['client_secret']
            ];

        } catch (Exception $e) {
            error_log("Failed to purchase content access: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get creator earnings summary
     */
    public function getCreatorEarnings(int $creatorId, string $period = '30d'): array
    {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    SUM(CASE WHEN type = 'subscription' THEN creator_amount ELSE 0 END) as subscription_earnings,
                    SUM(CASE WHEN type = 'tip' THEN creator_amount ELSE 0 END) as tip_earnings,
                    SUM(CASE WHEN type = 'content_purchase' THEN creator_amount ELSE 0 END) as content_earnings,
                    SUM(creator_amount) as total_earnings,
                    SUM(platform_fee) as total_fees,
                    COUNT(CASE WHEN type = 'subscription' THEN 1 END) as subscription_count,
                    COUNT(CASE WHEN type = 'tip' THEN 1 END) as tip_count,
                    COUNT(CASE WHEN type = 'content_purchase' THEN 1 END) as content_sales,
                    AVG(CASE WHEN type = 'tip' THEN amount END) as avg_tip_amount
                FROM transactions 
                WHERE creator_id = ? AND status = 'completed' AND created_at {$dateFilter['condition']}
            ");
            
            $stmt->execute(array_merge([$creatorId], $dateFilter['params']));
            $earnings = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get pending payouts
            $stmt = $this->pdo->prepare("
                SELECT SUM(amount) as pending_payout
                FROM payouts 
                WHERE creator_id = ? AND status = 'pending'
            ");
            $stmt->execute([$creatorId]);
            $pendingPayout = $stmt->fetchColumn() ?? 0;

            return [
                'total_earnings' => (float)($earnings['total_earnings'] ?? 0),
                'subscription_earnings' => (float)($earnings['subscription_earnings'] ?? 0),
                'tip_earnings' => (float)($earnings['tip_earnings'] ?? 0),
                'content_earnings' => (float)($earnings['content_earnings'] ?? 0),
                'total_fees' => (float)($earnings['total_fees'] ?? 0),
                'pending_payout' => (float)$pendingPayout,
                'subscription_count' => (int)($earnings['subscription_count'] ?? 0),
                'tip_count' => (int)($earnings['tip_count'] ?? 0),
                'content_sales' => (int)($earnings['content_sales'] ?? 0),
                'avg_tip_amount' => (float)($earnings['avg_tip_amount'] ?? 0)
            ];

        } catch (Exception $e) {
            error_log("Failed to get creator earnings: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process creator payout
     */
    public function processCreatorPayout(int $creatorId, float $amount): array
    {
        try {
            // Validate payout amount
            if ($amount < $this->config['min_payout_amount']) {
                throw new Exception("Minimum payout amount is {$this->config['min_payout_amount']}");
            }

            // Get creator payout details
            $creator = $this->getCreatorPayoutDetails($creatorId);
            if (!$creator) {
                throw new Exception('Creator payout details not found');
            }

            // Create payout record
            $payoutId = 'payout_' . bin2hex(random_bytes(8));
            
            $stmt = $this->pdo->prepare("
                INSERT INTO payouts (
                    id, creator_id, amount, currency, method, status,
                    payout_details, created_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
            ");
            
            $stmt->execute([
                $payoutId,
                $creatorId,
                $amount,
                $creator['currency'] ?? 'USD',
                $creator['payout_method'] ?? 'stripe',
                json_encode($creator['payout_details'] ?? [])
            ]);

            // Process payout based on method
            if ($creator['payout_method'] === 'stripe') {
                $stripeTransfer = $this->createStripeTransfer($creator['stripe_account_id'], $amount);
                
                // Update payout with Stripe transfer ID
                $stmt = $this->pdo->prepare("
                    UPDATE payouts 
                    SET stripe_transfer_id = ?, status = 'processing'
                    WHERE id = ?
                ");
                $stmt->execute([$stripeTransfer['id'], $payoutId]);
            }

            return [
                'payout_id' => $payoutId,
                'amount' => $amount,
                'status' => 'processing'
            ];

        } catch (Exception $e) {
            error_log("Failed to process payout: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle webhook events from payment providers
     */
    public function handleWebhook(string $provider, array $eventData): bool
    {
        try {
            switch ($provider) {
                case 'stripe':
                    return $this->handleStripeWebhook($eventData);
                case 'paypal':
                    return $this->handlePayPalWebhook($eventData);
                default:
                    throw new Exception('Unknown webhook provider');
            }
        } catch (Exception $e) {
            error_log("Webhook handling failed: " . $e->getMessage());
            return false;
        }
    }

    // Private helper methods
    private function validatePlanData(array $planData): void
    {
        $required = ['name', 'price'];
        foreach ($required as $field) {
            if (!isset($planData[$field]) || empty($planData[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        if ($planData['price'] < 0.99) {
            throw new Exception('Minimum subscription price is $0.99');
        }
    }

    private function getSubscriptionPlan(string $planId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM subscription_plans WHERE id = ?");
        $stmt->execute([$planId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getUserSubscriptionToCreator(int $userId, int $creatorId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM subscriptions 
            WHERE user_id = ? AND creator_id = ? 
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$userId, $creatorId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getPaidContent(string $contentId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM paid_content WHERE id = ?");
        $stmt->execute([$contentId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function userHasContentAccess(int $userId, string $contentId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM content_access 
            WHERE user_id = ? AND content_id = ? 
            AND (expires_at IS NULL OR expires_at > NOW())
        ");
        $stmt->execute([$userId, $contentId]);
        return $stmt->fetchColumn() > 0;
    }

    private function recordTransaction(array $transactionData): string
    {
        $transactionId = 'txn_' . bin2hex(random_bytes(8));
        
        $stmt = $this->pdo->prepare("
            INSERT INTO transactions (
                id, user_id, creator_id, subscription_id, content_id,
                amount, creator_amount, platform_fee, currency, type,
                status, message, stripe_payment_intent_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $transactionId,
            $transactionData['user_id'] ?? null,
            $transactionData['creator_id'] ?? null,
            $transactionData['subscription_id'] ?? null,
            $transactionData['content_id'] ?? null,
            $transactionData['amount'],
            $transactionData['creator_amount'] ?? $transactionData['amount'],
            $transactionData['platform_fee'] ?? 0,
            $transactionData['currency'],
            $transactionData['type'],
            $transactionData['status'],
            $transactionData['message'] ?? '',
            $transactionData['stripe_payment_intent_id'] ?? null
        ]);
        
        return $transactionId;
    }

    private function getDateFilter(string $period): array
    {
        switch ($period) {
            case '7d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                    'params' => []
                ];
            case '30d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
            case '90d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 90 DAY)',
                    'params' => []
                ];
            default:
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
        }
    }

    private function getCreatorPayoutDetails(int $creatorId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT payout_method, payout_details, stripe_account_id, currency
            FROM creator_payout_settings 
            WHERE creator_id = ?
        ");
        $stmt->execute([$creatorId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // Stripe integration methods (simplified - would use actual Stripe SDK)
    private function createStripeProduct(array $planData): array
    {
        // Simplified - would use actual Stripe API
        return [
            'id' => 'prod_' . bin2hex(random_bytes(8)),
            'name' => $planData['name']
        ];
    }

    private function createStripePrice(string $productId, array $planData): array
    {
        // Simplified - would use actual Stripe API
        return [
            'id' => 'price_' . bin2hex(random_bytes(8)),
            'product' => $productId,
            'unit_amount' => $planData['price'] * 100
        ];
    }

    private function createStripeSubscription(int $userId, array $plan, string $paymentMethodId): array
    {
        // Simplified - would use actual Stripe API
        return [
            'id' => 'sub_' . bin2hex(random_bytes(8)),
            'status' => 'active',
            'current_period_start' => time(),
            'current_period_end' => time() + (30 * 24 * 60 * 60),
            'latest_invoice' => 'in_' . bin2hex(random_bytes(8))
        ];
    }

    private function createStripePaymentIntent(float $amount, string $currency, array $metadata): array
    {
        // Simplified - would use actual Stripe API
        return [
            'id' => 'pi_' . bin2hex(random_bytes(8)),
            'client_secret' => 'pi_' . bin2hex(random_bytes(8)) . '_secret_' . bin2hex(random_bytes(8)),
            'amount' => $amount * 100,
            'currency' => $currency
        ];
    }

    private function createStripeTransfer(string $accountId, float $amount): array
    {
        // Simplified - would use actual Stripe API
        return [
            'id' => 'tr_' . bin2hex(random_bytes(8)),
            'amount' => $amount * 100,
            'destination' => $accountId
        ];
    }

    private function handleStripeWebhook(array $eventData): bool
    {
        // Handle Stripe webhook events
        return true;
    }

    private function handlePayPalWebhook(array $eventData): bool
    {
        // Handle PayPal webhook events
        return true;
    }
}
