-- Monetization System Database Schema
-- Creates tables for subscriptions, pay-per-view, donations, virtual gifts, and revenue tracking

-- Subscription plans and user subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    status ENUM('active', 'cancelled', 'expired', 'past_due') DEFAULT 'active',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    cancelled_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_subscription (user_id, status),
    INDEX idx_subscription_status (status),
    INDEX idx_subscription_period (current_period_end)
);

-- Pay-per-view events
CREATE TABLE IF NOT EXISTS ppv_events (
    id VARCHAR(36) PRIMARY KEY,
    creator_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    scheduled_time DATETIME NOT NULL,
    duration INT DEFAULT 60, -- minutes
    max_viewers INT NULL,
    status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    stream_id VARCHAR(36) NULL,
    total_sales DECIMAL(10, 2) DEFAULT 0.00,
    total_viewers INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    INDEX idx_creator_events (creator_id, status),
    INDEX idx_event_schedule (scheduled_time, status),
    INDEX idx_event_status (status)
);

-- Pay-per-view purchases
CREATE TABLE IF NOT EXISTS ppv_purchases (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    refunded_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES ppv_events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_event (user_id, event_id),
    INDEX idx_user_purchases (user_id, status),
    INDEX idx_event_purchases (event_id, status),
    INDEX idx_purchase_status (status)
);

-- Virtual gifts catalog and transactions
CREATE TABLE IF NOT EXISTS virtual_gifts (
    id VARCHAR(36) PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    stream_id VARCHAR(36) NULL,
    gift_id VARCHAR(50) NOT NULL,
    gift_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    value INT NOT NULL, -- gift value in platform currency
    message TEXT,
    payment_method_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    INDEX idx_sender_gifts (sender_id, sent_at),
    INDEX idx_recipient_gifts (recipient_id, sent_at),
    INDEX idx_stream_gifts (stream_id, sent_at),
    INDEX idx_gift_type (gift_id)
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id VARCHAR(36) PRIMARY KEY,
    donor_id INT NULL, -- can be anonymous
    recipient_id INT NOT NULL,
    stream_id VARCHAR(36) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    message TEXT,
    donor_name VARCHAR(100), -- for anonymous donations
    payment_method_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT FALSE,
    donated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    refunded_at DATETIME NULL,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    INDEX idx_donor_donations (donor_id, donated_at),
    INDEX idx_recipient_donations (recipient_id, donated_at),
    INDEX idx_stream_donations (stream_id, donated_at),
    INDEX idx_donation_status (status),
    INDEX idx_donation_amount (amount DESC)
);

-- Creator earnings and balances
CREATE TABLE IF NOT EXISTS creator_balances (
    creator_id INT PRIMARY KEY,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    last_payout_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_balance_amount (balance DESC)
);

-- Creator payouts
CREATE TABLE IF NOT EXISTS creator_payouts (
    id VARCHAR(36) PRIMARY KEY,
    creator_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'bank_transfer'
    payment_details JSON, -- encrypted payment details
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    stripe_transfer_id VARCHAR(255),
    failure_reason TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    completed_at DATETIME NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_payouts (creator_id, status),
    INDEX idx_payout_status (status),
    INDEX idx_payout_date (requested_at DESC)
);

-- Revenue tracking and analytics
CREATE TABLE IF NOT EXISTS revenue_logs (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('subscription', 'ppv', 'donation', 'gift', 'ad', 'sponsorship') NOT NULL,
    user_id INT NOT NULL, -- creator who earned the revenue
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    platform_fee DECIMAL(10, 2) NOT NULL,
    creator_share DECIMAL(10, 2) NOT NULL,
    reference_id VARCHAR(36), -- ID of the transaction (subscription_id, donation_id, etc.)
    reference_type VARCHAR(50), -- type of reference
    metadata JSON, -- additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_revenue_user (user_id, created_at),
    INDEX idx_revenue_type (type, created_at),
    INDEX idx_revenue_date (created_at DESC),
    INDEX idx_revenue_reference (reference_id, reference_type)
);

-- Sponsorship and brand partnerships
CREATE TABLE IF NOT EXISTS sponsorships (
    id VARCHAR(36) PRIMARY KEY,
    creator_id INT NOT NULL,
    sponsor_name VARCHAR(255) NOT NULL,
    sponsor_email VARCHAR(255),
    campaign_title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    deliverables JSON, -- what the creator needs to deliver
    status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    contract_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_sponsorships (creator_id, status),
    INDEX idx_sponsorship_dates (start_date, end_date),
    INDEX idx_sponsorship_status (status)
);

-- Ad revenue tracking
CREATE TABLE IF NOT EXISTS ad_revenue (
    id VARCHAR(36) PRIMARY KEY,
    creator_id INT NOT NULL,
    stream_id VARCHAR(36) NULL,
    ad_network VARCHAR(100) NOT NULL, -- 'google_ads', 'facebook_ads', etc.
    ad_type VARCHAR(50) NOT NULL, -- 'pre_roll', 'mid_roll', 'banner', etc.
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    revenue DECIMAL(10, 4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    INDEX idx_creator_ad_revenue (creator_id, date),
    INDEX idx_stream_ad_revenue (stream_id, date),
    INDEX idx_ad_network (ad_network, date),
    INDEX idx_ad_revenue_date (date DESC)
);

-- Payment methods for users
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'bank_account'
    stripe_payment_method_id VARCHAR(255),
    last_four VARCHAR(4),
    brand VARCHAR(50), -- 'visa', 'mastercard', etc.
    exp_month INT,
    exp_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_payment_methods (user_id, is_active),
    INDEX idx_default_payment_method (user_id, is_default)
);

-- Subscription plan features
CREATE TABLE IF NOT EXISTS subscription_features (
    plan_id VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    feature_value VARCHAR(255),
    PRIMARY KEY (plan_id, feature_key),
    INDEX idx_plan_features (plan_id)
);

-- Insert default subscription features
INSERT INTO subscription_features (plan_id, feature_key, feature_value) VALUES
('basic', 'ad_free_viewing', 'true'),
('basic', 'chat_privileges', 'true'),
('basic', 'mobile_streaming', 'true'),
('basic', 'max_stream_quality', '720p'),
('premium', 'ad_free_viewing', 'true'),
('premium', 'chat_privileges', 'true'),
('premium', 'mobile_streaming', 'true'),
('premium', 'hd_streaming', 'true'),
('premium', 'exclusive_content', 'true'),
('premium', 'max_stream_quality', '1080p'),
('creator', 'ad_free_viewing', 'true'),
('creator', 'chat_privileges', 'true'),
('creator', 'mobile_streaming', 'true'),
('creator', 'hd_streaming', 'true'),
('creator', 'exclusive_content', 'true'),
('creator', 'advanced_analytics', 'true'),
('creator', 'monetization_tools', 'true'),
('creator', 'priority_support', 'true'),
('creator', 'max_stream_quality', '1080p'),
('creator', 'max_concurrent_streams', '5');

-- Add monetization columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status ENUM('active', 'cancelled', 'expired') DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creator_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS monetization_enabled BOOLEAN DEFAULT FALSE;

-- Create indexes for new user columns
CREATE INDEX IF NOT EXISTS idx_user_subscription ON users(subscription_plan, subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_creator ON users(is_creator, creator_verified);
CREATE INDEX IF NOT EXISTS idx_user_monetization ON users(monetization_enabled);
