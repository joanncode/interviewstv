-- Security and Rate Limiting Tables
-- Created: 2025-08-27

-- Rate limiting requests tracking
CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'sliding_window',
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_violation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_rate_limit_identifier_action (identifier, action),
    INDEX idx_rate_limit_created_at (created_at),
    INDEX idx_rate_limit_ip (ip_address)
);

-- Rate limiting violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'sliding_window',
    current_count INT NOT NULL,
    limit_count INT NOT NULL,
    window_seconds INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_violations_identifier (identifier),
    INDEX idx_violations_created_at (created_at),
    INDEX idx_violations_ip (ip_address)
);

-- Security event logs
CREATE TABLE IF NOT EXISTS security_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    user_id INT UNSIGNED NULL,
    session_id VARCHAR(255),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_security_event_type (event_type),
    INDEX idx_security_created_at (created_at),
    INDEX idx_security_ip (ip_address),
    INDEX idx_security_user_id (user_id),
    INDEX idx_security_severity (severity),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- email, username, or IP
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_failed_login_identifier (identifier),
    INDEX idx_failed_login_ip (ip_address),
    INDEX idx_failed_login_created_at (created_at)
);

-- Banned IP addresses
CREATE TABLE IF NOT EXISTS banned_ips (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    banned_by INT UNSIGNED NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_banned_ips_active (is_active),
    INDEX idx_banned_ips_expires (expires_at),
    
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 404 error logs for analytics
CREATE TABLE IF NOT EXISTS error_404_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    path VARCHAR(2048) NOT NULL,
    referer VARCHAR(2048),
    user_agent TEXT,
    ip_address VARCHAR(45),
    user_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_404_path (path(255)),
    INDEX idx_404_created_at (created_at),
    INDEX idx_404_ip (ip_address),
    INDEX idx_404_user_id (user_id),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- URL redirects for SEO and migration
CREATE TABLE IF NOT EXISTS url_redirects (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_path VARCHAR(2048) NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    redirect_type ENUM('temporary', 'permanent') DEFAULT 'permanent',
    is_active BOOLEAN DEFAULT TRUE,
    hit_count INT UNSIGNED DEFAULT 0,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_source_path (source_path(255)),
    INDEX idx_redirects_active (is_active),
    INDEX idx_redirects_type (redirect_type),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- API keys for external access
CREATE TABLE IF NOT EXISTS api_keys (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_api_keys_user_id (user_id),
    INDEX idx_api_keys_active (is_active),
    INDEX idx_api_keys_expires (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Session security tracking
CREATE TABLE IF NOT EXISTS session_security (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INT UNSIGNED NULL,
    ip_address VARCHAR(45),
    user_agent_hash VARCHAR(255),
    is_suspicious BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_id (session_id),
    INDEX idx_session_user_id (user_id),
    INDEX idx_session_ip (ip_address),
    INDEX idx_session_activity (last_activity),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- File upload security logs
CREATE TABLE IF NOT EXISTS file_upload_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    original_filename VARCHAR(255),
    stored_filename VARCHAR(255),
    file_size BIGINT UNSIGNED,
    mime_type VARCHAR(100),
    ip_address VARCHAR(45),
    is_suspicious BOOLEAN DEFAULT FALSE,
    scan_result ENUM('clean', 'suspicious', 'malicious', 'error') DEFAULT 'clean',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_upload_user_id (user_id),
    INDEX idx_upload_created_at (created_at),
    INDEX idx_upload_suspicious (is_suspicious),
    INDEX idx_upload_scan_result (scan_result),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_rate_limits_cleanup ON rate_limit_requests (created_at, identifier, action);
CREATE INDEX idx_security_logs_analysis ON security_logs (event_type, created_at, severity);
CREATE INDEX idx_failed_logins_cleanup ON failed_login_attempts (created_at, is_locked);

-- Create views for common queries
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE(created_at) as date,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_logs 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), event_type, severity
ORDER BY date DESC, event_count DESC;

CREATE OR REPLACE VIEW rate_limit_summary AS
SELECT 
    action,
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(DISTINCT identifier) as unique_identifiers,
    SUM(CASE WHEN is_violation = 1 THEN 1 ELSE 0 END) as violations
FROM rate_limit_requests 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY action, DATE(created_at)
ORDER BY date DESC, total_requests DESC;

-- Insert default data
INSERT IGNORE INTO url_redirects (source_path, target_url, redirect_type) VALUES
('/old-interviews', '/explore', 'permanent'),
('/interview-list', '/explore', 'permanent'),
('/user-profiles', '/profiles', 'permanent');
