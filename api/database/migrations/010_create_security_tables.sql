-- Security and Authentication Database Schema
-- Creates tables for enhanced security, authentication, and compliance

-- Enhanced users table with security fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT,
ADD COLUMN IF NOT EXISTS last_login_at DATETIME,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until DATETIME,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'suspended', 'locked', 'deleted') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS privacy_settings JSON,
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_date DATETIME,
ADD COLUMN IF NOT EXISTS data_retention_date DATETIME,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Security events logging
CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_security_events_type (event_type, created_at),
    INDEX idx_security_events_user (user_id, created_at),
    INDEX idx_security_events_ip (ip_address, created_at),
    INDEX idx_security_events_severity (severity, created_at)
);

-- User sessions management
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions_user (user_id, is_active),
    INDEX idx_user_sessions_token (refresh_token_hash),
    INDEX idx_user_sessions_expiry (expires_at),
    INDEX idx_user_sessions_activity (last_activity)
);

-- OAuth providers and connections
CREATE TABLE IF NOT EXISTS oauth_providers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'twitter', 'github'
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_data JSON,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_user (provider, provider_user_id),
    INDEX idx_oauth_user (user_id, provider),
    INDEX idx_oauth_provider (provider, provider_user_id)
);

-- API keys and access tokens
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    permissions JSON, -- Array of permissions
    rate_limit_per_hour INT DEFAULT 1000,
    allowed_ips JSON, -- Array of allowed IP addresses
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_api_key (api_key_hash),
    INDEX idx_api_keys_user (user_id, is_active),
    INDEX idx_api_keys_hash (api_key_hash),
    INDEX idx_api_keys_expiry (expires_at)
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
    id VARCHAR(36) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP, user ID, or API key
    limit_type VARCHAR(50) NOT NULL, -- 'login', 'api', 'streaming'
    request_count INT DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    window_end DATETIME NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rate_limit (identifier, limit_type, window_start),
    INDEX idx_rate_limits_identifier (identifier, limit_type),
    INDEX idx_rate_limits_window (window_end),
    INDEX idx_rate_limits_blocked (is_blocked, window_end)
);

-- Data protection and privacy
CREATE TABLE IF NOT EXISTS data_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    request_type ENUM('export', 'delete', 'rectification', 'portability') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    request_data JSON,
    response_data JSON,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    completed_at DATETIME,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_data_requests_user (user_id, status),
    INDEX idx_data_requests_type (request_type, status),
    INDEX idx_data_requests_status (status, requested_at)
);

-- Content moderation and compliance
CREATE TABLE IF NOT EXISTS content_reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_id VARCHAR(36),
    reported_user_id VARCHAR(36),
    stream_id VARCHAR(36),
    content_type ENUM('stream', 'chat', 'profile', 'comment') NOT NULL,
    content_id VARCHAR(36),
    report_reason ENUM(
        'inappropriate_content', 'harassment', 'spam', 'violence', 
        'copyright_violation', 'underage_user', 'hate_speech', 'other'
    ) NOT NULL,
    description TEXT,
    evidence_urls JSON, -- Screenshots, recordings, etc.
    status ENUM('pending', 'under_review', 'resolved', 'dismissed') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_moderator_id VARCHAR(36),
    moderator_notes TEXT,
    action_taken ENUM('none', 'warning', 'content_removed', 'user_suspended', 'user_banned'),
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    resolved_at DATETIME,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_moderator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_reports_reporter (reporter_id, reported_at),
    INDEX idx_content_reports_reported (reported_user_id, status),
    INDEX idx_content_reports_stream (stream_id, status),
    INDEX idx_content_reports_status (status, priority),
    INDEX idx_content_reports_moderator (assigned_moderator_id, status)
);

-- DMCA and copyright management
CREATE TABLE IF NOT EXISTS dmca_requests (
    id VARCHAR(36) PRIMARY KEY,
    claimant_name VARCHAR(255) NOT NULL,
    claimant_email VARCHAR(255) NOT NULL,
    claimant_organization VARCHAR(255),
    copyrighted_work TEXT NOT NULL,
    infringing_content TEXT NOT NULL,
    stream_id VARCHAR(36),
    user_id VARCHAR(36),
    contact_info TEXT,
    sworn_statement BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'under_review', 'valid', 'invalid', 'counter_claimed') DEFAULT 'pending',
    takedown_date DATETIME,
    counter_claim_date DATETIME,
    counter_claim_reason TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    resolved_at DATETIME,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_dmca_requests_stream (stream_id, status),
    INDEX idx_dmca_requests_user (user_id, status),
    INDEX idx_dmca_requests_status (status, submitted_at),
    INDEX idx_dmca_requests_claimant (claimant_email, submitted_at)
);

-- Age verification and COPPA compliance
CREATE TABLE IF NOT EXISTS age_verifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    verification_method ENUM('id_document', 'credit_card', 'phone', 'parent_consent') NOT NULL,
    verification_data JSON, -- Encrypted verification details
    verified_age INT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date DATETIME,
    expires_at DATETIME,
    verifier_id VARCHAR(36), -- Staff member who verified
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verifier_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_age_verifications_user (user_id, is_verified),
    INDEX idx_age_verifications_status (is_verified, verification_date),
    INDEX idx_age_verifications_expiry (expires_at)
);

-- Parental consent for minors (COPPA compliance)
CREATE TABLE IF NOT EXISTS parental_consents (
    id VARCHAR(36) PRIMARY KEY,
    child_user_id VARCHAR(36) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(20),
    relationship VARCHAR(50) NOT NULL, -- 'parent', 'guardian'
    consent_method ENUM('email', 'phone', 'postal', 'fax', 'video_call') NOT NULL,
    consent_document_url VARCHAR(500),
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date DATETIME,
    consent_expires_at DATETIME,
    withdrawal_date DATETIME,
    verification_code VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_parental_consents_child (child_user_id, consent_given),
    INDEX idx_parental_consents_parent (parent_email, consent_given),
    INDEX idx_parental_consents_expiry (consent_expires_at)
);

-- Content analysis and AI moderation
CREATE TABLE IF NOT EXISTS content_analysis (
    id VARCHAR(36) PRIMARY KEY,
    stream_id VARCHAR(36),
    content_type ENUM('video', 'audio', 'text', 'image') NOT NULL,
    content_url VARCHAR(500),
    analysis_type VARCHAR(100) NOT NULL, -- 'toxicity', 'adult_content', 'violence', etc.
    ai_model VARCHAR(100), -- Which AI model was used
    confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
    analysis_result JSON,
    flags JSON, -- Array of detected issues
    human_review_required BOOLEAN DEFAULT FALSE,
    human_reviewed BOOLEAN DEFAULT FALSE,
    human_reviewer_id VARCHAR(36),
    final_decision ENUM('approved', 'rejected', 'needs_editing') DEFAULT 'approved',
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (human_reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_analysis_stream (stream_id, analyzed_at),
    INDEX idx_content_analysis_type (content_type, analysis_type),
    INDEX idx_content_analysis_review (human_review_required, human_reviewed),
    INDEX idx_content_analysis_confidence (confidence_score DESC)
);

-- Compliance audit logs
CREATE TABLE IF NOT EXISTS compliance_logs (
    id VARCHAR(36) PRIMARY KEY,
    compliance_type ENUM('gdpr', 'coppa', 'dmca', 'ccpa', 'pipeda') NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(36),
    staff_id VARCHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_compliance_logs_type (compliance_type, created_at),
    INDEX idx_compliance_logs_user (user_id, created_at),
    INDEX idx_compliance_logs_staff (staff_id, created_at),
    INDEX idx_compliance_logs_action (action, created_at)
);

-- Create indexes for enhanced security
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email, email_verified);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status, last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_mfa ON users(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_users_consent ON users(consent_given, consent_date);
CREATE INDEX IF NOT EXISTS idx_users_age_verified ON users(age_verified, birth_date);

-- Insert default security roles and permissions
INSERT IGNORE INTO user_roles (role_name, permissions, description) VALUES
('user', JSON_ARRAY('view_content', 'create_stream', 'chat', 'donate'), 'Standard user permissions'),
('creator', JSON_ARRAY('view_content', 'create_stream', 'chat', 'donate', 'monetize', 'analytics'), 'Content creator permissions'),
('moderator', JSON_ARRAY('view_content', 'create_stream', 'chat', 'donate', 'moderate_content', 'ban_users'), 'Content moderator permissions'),
('admin', JSON_ARRAY('*'), 'Administrator with all permissions');

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSON NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
