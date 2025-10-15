-- Payment Gateway Integration Tables
-- Task 6.2.6: Implement payment gateway integration

-- Payment providers configuration
CREATE TABLE IF NOT EXISTS payment_providers (
    provider_id VARCHAR(50) PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('credit_card', 'digital_wallet', 'bank_transfer', 'cryptocurrency', 'buy_now_pay_later')),
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    supported_currencies TEXT, -- JSON array of currency codes
    supported_countries TEXT, -- JSON array of country codes
    features TEXT, -- JSON array of features
    api_base_url VARCHAR(500),
    api_version VARCHAR(20),
    webhook_url VARCHAR(500),
    oauth_authorize_url VARCHAR(500),
    oauth_token_url VARCHAR(500),
    oauth_scopes TEXT, -- JSON array of scopes
    test_mode_available BOOLEAN DEFAULT 1,
    live_mode_available BOOLEAN DEFAULT 1,
    transaction_fee_percentage DECIMAL(5,4) DEFAULT 0.0000,
    transaction_fee_fixed DECIMAL(10,2) DEFAULT 0.00,
    minimum_amount DECIMAL(10,2) DEFAULT 0.01,
    maximum_amount DECIMAL(15,2) DEFAULT 999999.99,
    settlement_time_hours INTEGER DEFAULT 24,
    refund_policy VARCHAR(50) DEFAULT 'full',
    chargeback_protection BOOLEAN DEFAULT 0,
    fraud_detection BOOLEAN DEFAULT 0,
    recurring_payments BOOLEAN DEFAULT 0,
    marketplace_support BOOLEAN DEFAULT 0,
    mobile_optimized BOOLEAN DEFAULT 1,
    pci_compliant BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User payment gateway connections
CREATE TABLE IF NOT EXISTS user_payment_connections (
    connection_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    connection_name VARCHAR(100),
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'inactive', 'suspended', 'expired', 'error')),
    environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
    api_credentials TEXT, -- JSON with encrypted credentials
    webhook_secret VARCHAR(255),
    webhook_events TEXT, -- JSON array of subscribed events
    auto_capture BOOLEAN DEFAULT 1,
    default_currency VARCHAR(3) DEFAULT 'USD',
    business_info TEXT, -- JSON with business details
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES payment_providers(provider_id) ON DELETE CASCADE
);

-- Payment methods (customer payment instruments)
CREATE TABLE IF NOT EXISTS payment_methods (
    method_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100), -- Provider's customer ID
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('card', 'bank_account', 'digital_wallet', 'crypto_wallet', 'bnpl')),
    provider_method_id VARCHAR(100), -- Provider's payment method ID
    method_data TEXT, -- JSON with method details (masked/tokenized)
    billing_address TEXT, -- JSON with billing address
    is_default BOOLEAN DEFAULT 0,
    is_verified BOOLEAN DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    method_id VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'chargeback', 'fee', 'payout')),
    transaction_status VARCHAR(20) DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'disputed')),
    intent VARCHAR(20) DEFAULT 'capture' CHECK (intent IN ('capture', 'authorize', 'subscription')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2),
    description TEXT,
    metadata TEXT, -- JSON with additional data
    customer_info TEXT, -- JSON with customer details
    billing_address TEXT, -- JSON with billing address
    shipping_address TEXT, -- JSON with shipping address
    payment_source VARCHAR(50), -- interview, subscription, marketplace, etc.
    reference_id VARCHAR(100), -- Reference to interview, subscription, etc.
    failure_reason TEXT,
    failure_code VARCHAR(50),
    risk_score INTEGER, -- 0-100 fraud risk score
    risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('low', 'normal', 'elevated', 'highest')),
    captured_at TIMESTAMP,
    authorized_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    disputed_at TIMESTAMP,
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (method_id) REFERENCES payment_methods(method_id) ON DELETE SET NULL
);

-- Subscription plans and billing
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    provider_plan_id VARCHAR(100),
    plan_name VARCHAR(100) NOT NULL,
    plan_description TEXT,
    plan_type VARCHAR(20) DEFAULT 'recurring' CHECK (plan_type IN ('one_time', 'recurring', 'usage_based', 'tiered')),
    billing_interval VARCHAR(20) DEFAULT 'monthly' CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    billing_interval_count INTEGER DEFAULT 1,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    trial_period_days INTEGER DEFAULT 0,
    features TEXT, -- JSON array of plan features
    limits_config TEXT, -- JSON with usage limits
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE
);

-- Customer subscriptions
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    subscription_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    plan_id VARCHAR(100) NOT NULL,
    method_id VARCHAR(100),
    provider_subscription_id VARCHAR(100),
    customer_id VARCHAR(100),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'paused')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT 0,
    pause_collection BOOLEAN DEFAULT 0,
    proration_behavior VARCHAR(20) DEFAULT 'create_prorations',
    billing_cycle_anchor TIMESTAMP,
    next_billing_date TIMESTAMP,
    last_payment_date TIMESTAMP,
    failed_payment_count INTEGER DEFAULT 0,
    metadata TEXT, -- JSON with additional data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
    FOREIGN KEY (method_id) REFERENCES payment_methods(method_id) ON DELETE SET NULL
);

-- Payment webhooks and events
CREATE TABLE IF NOT EXISTS payment_webhooks (
    webhook_id VARCHAR(100) PRIMARY KEY,
    connection_id VARCHAR(100) NOT NULL,
    provider_webhook_id VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT, -- JSON with event payload
    webhook_signature VARCHAR(500),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'ignored')),
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE
);

-- Payment analytics and reporting
CREATE TABLE IF NOT EXISTS payment_analytics (
    analytics_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    date_period DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    refunded_transactions INTEGER DEFAULT 0,
    disputed_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(15,2) DEFAULT 0.00,
    successful_volume DECIMAL(15,2) DEFAULT 0.00,
    refunded_volume DECIMAL(15,2) DEFAULT 0.00,
    fee_volume DECIMAL(10,2) DEFAULT 0.00,
    net_volume DECIMAL(15,2) DEFAULT 0.00,
    average_transaction_amount DECIMAL(10,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    chargeback_rate DECIMAL(5,2) DEFAULT 0.00,
    refund_rate DECIMAL(5,2) DEFAULT 0.00,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    subscription_signups INTEGER DEFAULT 0,
    subscription_cancellations INTEGER DEFAULT 0,
    mrr_amount DECIMAL(15,2) DEFAULT 0.00, -- Monthly Recurring Revenue
    arr_amount DECIMAL(15,2) DEFAULT 0.00, -- Annual Recurring Revenue
    ltv_amount DECIMAL(15,2) DEFAULT 0.00, -- Customer Lifetime Value
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_payment_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(user_id, connection_id, date_period)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_payment_connections_user ON user_payment_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_connections_provider ON user_payment_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_connection ON payment_methods(connection_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_connection ON payment_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user ON subscription_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_user ON customer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_connection ON payment_webhooks(connection_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(processing_status);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_user_date ON payment_analytics(user_id, date_period);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_connection_date ON payment_analytics(connection_id, date_period);

-- Insert default payment providers
INSERT OR IGNORE INTO payment_providers (
    provider_id, provider_name, provider_type, description, logo_url, website_url,
    supported_currencies, supported_countries, features, api_base_url, api_version,
    transaction_fee_percentage, transaction_fee_fixed, minimum_amount, maximum_amount,
    settlement_time_hours, refund_policy, chargeback_protection, fraud_detection,
    recurring_payments, marketplace_support, mobile_optimized, pci_compliant
) VALUES
('stripe', 'Stripe', 'credit_card', 'Complete payments platform for the internet',
 'https://via.placeholder.com/60x60/635BFF/FFFFFF?text=ST', 'https://stripe.com',
 '["USD","EUR","GBP","CAD","AUD","JPY","CHF","SEK","NOK","DKK","PLN","CZK","HUF","BGN","RON","HRK","LTL","LVL","EEK","SKK","SIT","MTL","CYP"]',
 '["US","CA","GB","AU","AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","CH","NO","IS","LI","MC","SM","VA","AD","GI","IM","JE","GG"]',
 '["credit_cards","debit_cards","digital_wallets","bank_transfers","buy_now_pay_later","subscriptions","marketplace","mobile_payments","fraud_detection","3d_secure","webhooks","analytics"]',
 'https://api.stripe.com', 'v1', 0.0290, 0.30, 0.50, 999999.99, 2, 'full', 1, 1, 1, 1, 1, 1),

('paypal', 'PayPal', 'digital_wallet', 'Global leader in online payments and digital wallets',
 'https://via.placeholder.com/60x60/0070BA/FFFFFF?text=PP', 'https://paypal.com',
 '["USD","EUR","GBP","CAD","AUD","JPY","CHF","SEK","NOK","DKK","PLN","CZK","HUF","ILS","MXN","BRL","TWD","THB","SGD","HKD","NZD","PHP","INR","MYR","TRY","RUB"]',
 '["US","CA","GB","AU","AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","CH","NO","IS","BR","MX","IN","SG","HK","TW","TH","PH","MY","NZ","IL","TR","RU","JP"]',
 '["paypal_wallet","credit_cards","debit_cards","bank_transfers","buy_now_pay_later","subscriptions","marketplace","mobile_payments","buyer_protection","seller_protection","webhooks"]',
 'https://api.paypal.com', 'v2', 0.0349, 0.49, 0.01, 10000.00, 24, 'full', 1, 1, 1, 1, 1, 1),

('square', 'Square', 'credit_card', 'Payment processing for businesses of all sizes',
 'https://via.placeholder.com/60x60/3E4348/FFFFFF?text=SQ', 'https://squareup.com',
 '["USD","CAD","GBP","EUR","AUD","JPY"]',
 '["US","CA","GB","AU","JP","FR","ES","IE"]',
 '["credit_cards","debit_cards","contactless_payments","mobile_payments","pos_integration","invoicing","subscriptions","analytics","fraud_detection"]',
 'https://connect.squareup.com', 'v2', 0.0290, 0.30, 1.00, 50000.00, 1, 'full', 1, 1, 1, 0, 1, 1),

('adyen', 'Adyen', 'credit_card', 'Global payment platform for enterprise businesses',
 'https://via.placeholder.com/60x60/0ABF53/FFFFFF?text=AD', 'https://adyen.com',
 '["USD","EUR","GBP","CAD","AUD","JPY","CHF","SEK","NOK","DKK","PLN","CZK","HUF","BGN","RON","HRK","BRL","MXN","SGD","HKD","CNY","INR","KRW","THB","MYR","PHP","IDR","VND","TWD","ZAR","TRY","RUB","AED","SAR","QAR","KWD","BHD","OMR","JOD","LBP","EGP","MAD","TND","DZD","LYD","ETB","KES","UGX","TZS","RWF","MWK","ZMW","BWP","SZL","LSL","NAD","MZN","AOA","XOF","XAF","CDF","GHS","NGN","XPF","FJD","PGK","SBD","TOP","VUV","WST"]',
 '["US","CA","GB","AU","AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","CH","NO","IS","BR","MX","AR","CL","CO","PE","UY","SG","HK","TW","TH","PH","MY","ID","VN","IN","CN","JP","KR","AE","SA","QA","KW","BH","OM","JO","LB","EG","MA","TN","DZ","LY","ET","KE","UG","TZ","RW","MW","ZM","BW","SZ","LS","NA","MZ","AO","GH","NG","ZA","FJ","PG","SB","TO","VU","WS"]',
 '["credit_cards","debit_cards","digital_wallets","bank_transfers","alternative_payments","mobile_payments","pos_integration","subscriptions","marketplace","fraud_detection","3d_secure","webhooks","analytics","reporting"]',
 'https://checkout-test.adyen.com', 'v70', 0.0280, 0.28, 0.01, 999999.99, 1, 'full', 1, 1, 1, 1, 1, 1),

('braintree', 'Braintree', 'credit_card', 'PayPal service for seamless payment experiences',
 'https://via.placeholder.com/60x60/00C389/FFFFFF?text=BT', 'https://braintreepayments.com',
 '["USD","EUR","GBP","CAD","AUD","DKK","NOK","SEK","CHF","PLN","CZK","HUF","SGD","HKD","MYR","THB","TWD","NZD"]',
 '["US","CA","GB","AU","FR","DE","ES","IT","NL","BE","AT","CH","DK","NO","SE","FI","PL","CZ","HU","SG","HK","MY","TH","TW","NZ"]',
 '["credit_cards","debit_cards","paypal","apple_pay","google_pay","venmo","subscriptions","marketplace","fraud_detection","3d_secure","webhooks","analytics"]',
 'https://api.sandbox.braintreegateway.com', 'v1', 0.0290, 0.30, 1.00, 999999.99, 1, 'full', 1, 1, 1, 1, 1, 1),

('razorpay', 'Razorpay', 'credit_card', 'Complete payment solution for Indian businesses',
 'https://via.placeholder.com/60x60/3395FF/FFFFFF?text=RZ', 'https://razorpay.com',
 '["INR","USD","EUR","GBP","AUD","CAD","SGD","AED","MYR"]',
 '["IN","US","MY","SG","AE"]',
 '["credit_cards","debit_cards","net_banking","upi","wallets","emi","cardless_emi","paylater","subscriptions","marketplace","fraud_detection","webhooks","analytics"]',
 'https://api.razorpay.com', 'v1', 0.0200, 0.00, 1.00, 1000000.00, 3, 'full', 1, 1, 1, 1, 1, 1);
