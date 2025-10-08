-- Monetization System Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for creator monetization and payment processing

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    creator_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_interval ENUM('monthly', 'yearly') DEFAULT 'monthly',
    features JSON COMMENT 'Plan features and benefits',
    stripe_product_id VARCHAR(100),
    stripe_price_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_is_active (is_active),
    INDEX idx_price (price),
    INDEX idx_billing_interval (billing_interval)
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    creator_id INT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    stripe_subscription_id VARCHAR(100),
    status ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete') DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    trial_start TIMESTAMP NULL,
    trial_end TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_plan_id (plan_id),
    INDEX idx_status (status),
    INDEX idx_current_period_end (current_period_end),
    UNIQUE KEY unique_user_creator_active (user_id, creator_id, status)
);

-- Paid Content Table
CREATE TABLE IF NOT EXISTS paid_content (
    id VARCHAR(50) PRIMARY KEY,
    creator_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content_type ENUM('interview', 'video', 'audio', 'document', 'course') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    access_duration INT DEFAULT 30 COMMENT 'Access duration in days',
    preview_content TEXT COMMENT 'Free preview content',
    full_content LONGTEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    file_url VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    download_count INT DEFAULT 0,
    purchase_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_content_type (content_type),
    INDEX idx_price (price),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_title_description (title, description)
);

-- Content Access Table
CREATE TABLE IF NOT EXISTS content_access (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content_id VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(50),
    access_granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    download_count INT DEFAULT 0,
    last_accessed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES paid_content(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_content_id (content_id),
    INDEX idx_expires_at (expires_at),
    UNIQUE KEY unique_user_content (user_id, content_id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NULL COMMENT 'Payer user ID',
    creator_id INT NOT NULL COMMENT 'Recipient creator ID',
    subscription_id VARCHAR(50) NULL,
    content_id VARCHAR(50) NULL,
    amount DECIMAL(10,2) NOT NULL,
    creator_amount DECIMAL(10,2) NOT NULL COMMENT 'Amount after platform fee',
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    type ENUM('subscription', 'tip', 'content_purchase', 'donation') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded', 'disputed') DEFAULT 'pending',
    payment_method ENUM('stripe', 'paypal', 'crypto') DEFAULT 'stripe',
    stripe_payment_intent_id VARCHAR(100),
    paypal_payment_id VARCHAR(100),
    message TEXT COMMENT 'Optional message from payer',
    refund_reason TEXT,
    refunded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (content_id) REFERENCES paid_content(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_amount (amount)
);

-- Creator Payout Settings Table
CREATE TABLE IF NOT EXISTS creator_payout_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    payout_method ENUM('stripe', 'paypal', 'bank_transfer') DEFAULT 'stripe',
    stripe_account_id VARCHAR(100),
    paypal_email VARCHAR(255),
    bank_details JSON COMMENT 'Bank account details (encrypted)',
    payout_details JSON COMMENT 'Additional payout configuration',
    currency VARCHAR(3) DEFAULT 'USD',
    minimum_payout DECIMAL(10,2) DEFAULT 50.00,
    payout_schedule ENUM('weekly', 'monthly') DEFAULT 'monthly',
    tax_information JSON COMMENT 'Tax forms and details',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_creator (creator_id),
    INDEX idx_payout_method (payout_method),
    INDEX idx_is_verified (is_verified)
);

-- Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id VARCHAR(50) PRIMARY KEY,
    creator_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    method ENUM('stripe', 'paypal', 'bank_transfer') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed', 'canceled') DEFAULT 'pending',
    stripe_transfer_id VARCHAR(100),
    paypal_payout_id VARCHAR(100),
    payout_details JSON COMMENT 'Payout method specific details',
    failure_reason TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_processed_at (processed_at)
);

-- Revenue Sharing Table
CREATE TABLE IF NOT EXISTS revenue_sharing (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    creator_id INT NOT NULL,
    platform_revenue DECIMAL(10,2) NOT NULL,
    creator_revenue DECIMAL(10,2) NOT NULL,
    affiliate_revenue DECIMAL(10,2) DEFAULT 0.00,
    affiliate_id INT NULL,
    revenue_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (affiliate_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_revenue_date (revenue_date),
    UNIQUE KEY unique_transaction_revenue (transaction_id)
);

-- Subscription Analytics Table
CREATE TABLE IF NOT EXISTS subscription_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    new_subscriptions INT DEFAULT 0,
    canceled_subscriptions INT DEFAULT 0,
    active_subscriptions INT DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    churn_rate DECIMAL(5,2) DEFAULT 0.00,
    mrr DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Monthly Recurring Revenue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_plan_id (plan_id),
    INDEX idx_date (date),
    UNIQUE KEY unique_creator_plan_date (creator_id, plan_id, date)
);

-- Discount Codes Table
CREATE TABLE IF NOT EXISTS discount_codes (
    id VARCHAR(50) PRIMARY KEY,
    creator_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    type ENUM('percentage', 'fixed_amount') NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    applies_to ENUM('all', 'subscription', 'content') DEFAULT 'all',
    plan_ids JSON COMMENT 'Specific plan IDs if applicable',
    content_ids JSON COMMENT 'Specific content IDs if applicable',
    usage_limit INT NULL COMMENT 'Max number of uses',
    usage_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_code (code),
    INDEX idx_valid_until (valid_until),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_creator_code (creator_id, code)
);

-- Discount Usage Table
CREATE TABLE IF NOT EXISTS discount_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    discount_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    transaction_id VARCHAR(50) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (discount_id) REFERENCES discount_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_discount_id (discount_id),
    INDEX idx_user_id (user_id),
    INDEX idx_used_at (used_at)
);

-- Insert default subscription tiers
INSERT IGNORE INTO subscription_plans (id, creator_id, name, description, price, features) VALUES
('plan_basic_default', 1, 'Basic Tier', 'Ad-free viewing and early access to content', 4.99, JSON_ARRAY('ad_free', 'early_access')),
('plan_premium_default', 1, 'Premium Tier', 'All basic features plus exclusive content and direct messaging', 9.99, JSON_ARRAY('ad_free', 'early_access', 'exclusive_content', 'direct_messaging')),
('plan_vip_default', 1, 'VIP Tier', 'All premium features plus priority support and custom badges', 19.99, JSON_ARRAY('ad_free', 'early_access', 'exclusive_content', 'direct_messaging', 'priority_support', 'custom_badges'));

-- Create views for analytics

-- Creator Revenue Summary View
CREATE OR REPLACE VIEW creator_revenue_summary AS
SELECT 
    t.creator_id,
    u.name as creator_name,
    SUM(CASE WHEN t.type = 'subscription' AND t.status = 'completed' THEN t.creator_amount ELSE 0 END) as subscription_revenue,
    SUM(CASE WHEN t.type = 'tip' AND t.status = 'completed' THEN t.creator_amount ELSE 0 END) as tip_revenue,
    SUM(CASE WHEN t.type = 'content_purchase' AND t.status = 'completed' THEN t.creator_amount ELSE 0 END) as content_revenue,
    SUM(CASE WHEN t.status = 'completed' THEN t.creator_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN t.status = 'completed' THEN t.platform_fee ELSE 0 END) as total_platform_fees,
    COUNT(CASE WHEN t.type = 'subscription' AND t.status = 'completed' THEN 1 END) as subscription_count,
    COUNT(CASE WHEN t.type = 'tip' AND t.status = 'completed' THEN 1 END) as tip_count,
    COUNT(CASE WHEN t.type = 'content_purchase' AND t.status = 'completed' THEN 1 END) as content_sales,
    DATE(t.created_at) as revenue_date
FROM transactions t
JOIN users u ON t.creator_id = u.id
WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY t.creator_id, DATE(t.created_at)
ORDER BY revenue_date DESC, total_revenue DESC;

-- Subscription Metrics View
CREATE OR REPLACE VIEW subscription_metrics AS
SELECT 
    sp.creator_id,
    sp.id as plan_id,
    sp.name as plan_name,
    sp.price,
    COUNT(s.id) as active_subscriptions,
    SUM(s.amount) as monthly_revenue,
    AVG(DATEDIFF(COALESCE(s.canceled_at, NOW()), s.created_at)) as avg_subscription_length,
    COUNT(CASE WHEN s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_subscriptions_30d,
    COUNT(CASE WHEN s.canceled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as canceled_subscriptions_30d
FROM subscription_plans sp
LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
GROUP BY sp.id
ORDER BY monthly_revenue DESC;

-- Top Earning Creators View
CREATE OR REPLACE VIEW top_earning_creators AS
SELECT 
    u.id as creator_id,
    u.name,
    u.profile_image_url,
    SUM(CASE WHEN t.status = 'completed' THEN t.creator_amount ELSE 0 END) as total_earnings,
    COUNT(DISTINCT s.user_id) as subscriber_count,
    COUNT(DISTINCT t.user_id) as supporter_count,
    AVG(CASE WHEN t.type = 'tip' AND t.status = 'completed' THEN t.amount END) as avg_tip_amount,
    MAX(t.created_at) as last_transaction_date
FROM users u
LEFT JOIN transactions t ON u.id = t.creator_id
LEFT JOIN subscriptions s ON u.id = s.creator_id AND s.status = 'active'
WHERE u.user_type = 'creator'
GROUP BY u.id
HAVING total_earnings > 0
ORDER BY total_earnings DESC
LIMIT 100;

-- Content Performance View
CREATE OR REPLACE VIEW content_performance AS
SELECT 
    pc.id as content_id,
    pc.title,
    pc.content_type,
    pc.price,
    pc.purchase_count,
    pc.download_count,
    (pc.purchase_count * pc.price) as total_revenue,
    COUNT(ca.user_id) as active_access_count,
    AVG(DATEDIFF(COALESCE(ca.expires_at, NOW()), ca.access_granted_at)) as avg_access_duration,
    pc.created_at
FROM paid_content pc
LEFT JOIN content_access ca ON pc.id = ca.content_id
WHERE pc.is_active = TRUE
GROUP BY pc.id
ORDER BY total_revenue DESC;

-- Create stored procedures for monetization operations

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetCreatorEarningsReport(IN p_creator_id INT, IN p_days INT DEFAULT 30)
BEGIN
    SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'subscription' AND status = 'completed' THEN creator_amount ELSE 0 END) as subscription_earnings,
        SUM(CASE WHEN type = 'tip' AND status = 'completed' THEN creator_amount ELSE 0 END) as tip_earnings,
        SUM(CASE WHEN type = 'content_purchase' AND status = 'completed' THEN creator_amount ELSE 0 END) as content_earnings,
        SUM(CASE WHEN status = 'completed' THEN creator_amount ELSE 0 END) as total_earnings,
        COUNT(CASE WHEN type = 'subscription' AND status = 'completed' THEN 1 END) as subscription_count,
        COUNT(CASE WHEN type = 'tip' AND status = 'completed' THEN 1 END) as tip_count
    FROM transactions
    WHERE creator_id = p_creator_id
    AND created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END//

CREATE PROCEDURE IF NOT EXISTS ProcessMonthlyPayouts()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_creator_id INT;
    DECLARE v_total_earnings DECIMAL(10,2);
    DECLARE v_min_payout DECIMAL(10,2);
    
    DECLARE creator_cursor CURSOR FOR
        SELECT 
            t.creator_id,
            SUM(t.creator_amount) as total_earnings,
            COALESCE(cps.minimum_payout, 50.00) as min_payout
        FROM transactions t
        LEFT JOIN creator_payout_settings cps ON t.creator_id = cps.creator_id
        WHERE t.status = 'completed'
        AND t.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND t.creator_id NOT IN (
            SELECT creator_id FROM payouts 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            AND status IN ('pending', 'processing', 'completed')
        )
        GROUP BY t.creator_id
        HAVING total_earnings >= min_payout;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN creator_cursor;
    
    read_loop: LOOP
        FETCH creator_cursor INTO v_creator_id, v_total_earnings, v_min_payout;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Create payout record
        INSERT INTO payouts (
            id, creator_id, amount, status, created_at
        ) VALUES (
            CONCAT('payout_', SUBSTRING(MD5(RAND()), 1, 16)),
            v_creator_id,
            v_total_earnings,
            'pending',
            NOW()
        );
        
    END LOOP;
    
    CLOSE creator_cursor;
END//

CREATE PROCEDURE IF NOT EXISTS UpdateSubscriptionAnalytics()
BEGIN
    INSERT INTO subscription_analytics (
        creator_id, plan_id, date, new_subscriptions, canceled_subscriptions, 
        active_subscriptions, revenue, mrr
    )
    SELECT 
        sp.creator_id,
        sp.id as plan_id,
        CURDATE() as date,
        COUNT(CASE WHEN s.created_at >= CURDATE() THEN 1 END) as new_subscriptions,
        COUNT(CASE WHEN s.canceled_at >= CURDATE() THEN 1 END) as canceled_subscriptions,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
        SUM(CASE WHEN s.status = 'active' THEN s.amount ELSE 0 END) as revenue,
        SUM(CASE WHEN s.status = 'active' THEN s.amount ELSE 0 END) as mrr
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON sp.id = s.plan_id
    GROUP BY sp.creator_id, sp.id
    ON DUPLICATE KEY UPDATE
        new_subscriptions = VALUES(new_subscriptions),
        canceled_subscriptions = VALUES(canceled_subscriptions),
        active_subscriptions = VALUES(active_subscriptions),
        revenue = VALUES(revenue),
        mrr = VALUES(mrr);
END//

DELIMITER ;

-- Create triggers for automatic analytics

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        INSERT INTO revenue_sharing (
            transaction_id, creator_id, platform_revenue, creator_revenue, revenue_date
        ) VALUES (
            NEW.id, NEW.creator_id, NEW.platform_fee, NEW.creator_amount, DATE(NEW.created_at)
        );
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS after_subscription_update
AFTER UPDATE ON subscriptions
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        -- Update subscription analytics when status changes
        CALL UpdateSubscriptionAnalytics();
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS after_content_purchase
AFTER INSERT ON content_access
FOR EACH ROW
BEGIN
    UPDATE paid_content 
    SET purchase_count = purchase_count + 1
    WHERE id = NEW.content_id;
END//

DELIMITER ;

-- Add monetization-related columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creator_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subscriber_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS monetization_enabled BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users(is_creator);
CREATE INDEX IF NOT EXISTS idx_users_creator_verified ON users(creator_verified);
CREATE INDEX IF NOT EXISTS idx_users_monetization_enabled ON users(monetization_enabled);
