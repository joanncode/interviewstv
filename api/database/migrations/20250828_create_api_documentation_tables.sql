-- API Documentation Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for API documentation, usage tracking, and analytics

-- API Logs Table for Usage Analytics
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD') NOT NULL,
    status_code INT NOT NULL,
    response_time DECIMAL(8,3) DEFAULT 0.000 COMMENT 'Response time in milliseconds',
    user_id INT NULL,
    api_key_id VARCHAR(50) NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_size BIGINT DEFAULT 0 COMMENT 'Request size in bytes',
    response_size BIGINT DEFAULT 0 COMMENT 'Response size in bytes',
    request_headers JSON COMMENT 'Request headers (sanitized)',
    response_headers JSON COMMENT 'Response headers',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    INDEX idx_status_code (status_code),
    INDEX idx_user_id (user_id),
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_created_at (created_at),
    INDEX idx_response_time (response_time)
);

-- API Keys Table for Authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL COMMENT 'Hashed API key',
    permissions JSON COMMENT 'API permissions and scopes',
    rate_limit_per_hour INT DEFAULT 1000,
    rate_limit_per_minute INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_key_hash (key_hash),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    UNIQUE KEY unique_user_name (user_id, name)
);

-- API Rate Limiting Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL COMMENT 'IP address or API key',
    identifier_type ENUM('ip', 'api_key', 'user') NOT NULL,
    endpoint VARCHAR(255),
    requests_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_identifier (identifier),
    INDEX idx_identifier_type (identifier_type),
    INDEX idx_endpoint (endpoint),
    INDEX idx_window_end (window_end),
    UNIQUE KEY unique_rate_limit (identifier, identifier_type, endpoint, window_start)
);

-- API Documentation Versions Table
CREATE TABLE IF NOT EXISTS api_documentation_versions (
    id VARCHAR(50) PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    openapi_spec JSON NOT NULL COMMENT 'Complete OpenAPI 3.0 specification',
    changelog TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    deprecated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_version (version),
    INDEX idx_is_active (is_active),
    INDEX idx_is_deprecated (is_deprecated),
    UNIQUE KEY unique_version (version)
);

-- API Endpoints Documentation Table
CREATE TABLE IF NOT EXISTS api_endpoints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    documentation_version_id VARCHAR(50) NOT NULL,
    path VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD') NOT NULL,
    summary VARCHAR(255),
    description TEXT,
    tags JSON COMMENT 'Endpoint tags/categories',
    parameters JSON COMMENT 'Endpoint parameters',
    request_body JSON COMMENT 'Request body schema',
    responses JSON COMMENT 'Response schemas',
    security_requirements JSON COMMENT 'Security requirements',
    examples JSON COMMENT 'Request/response examples',
    is_deprecated BOOLEAN DEFAULT FALSE,
    deprecated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (documentation_version_id) REFERENCES api_documentation_versions(id) ON DELETE CASCADE,
    INDEX idx_documentation_version_id (documentation_version_id),
    INDEX idx_path (path),
    INDEX idx_method (method),
    INDEX idx_is_deprecated (is_deprecated),
    UNIQUE KEY unique_endpoint (documentation_version_id, path, method)
);

-- API Usage Statistics Table
CREATE TABLE IF NOT EXISTS api_usage_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    endpoint VARCHAR(255),
    method ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'),
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    avg_response_time DECIMAL(8,3) DEFAULT 0.000,
    min_response_time DECIMAL(8,3) DEFAULT 0.000,
    max_response_time DECIMAL(8,3) DEFAULT 0.000,
    total_data_transferred BIGINT DEFAULT 0 COMMENT 'Total bytes transferred',
    unique_users INT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_date (date),
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    UNIQUE KEY unique_daily_stats (date, endpoint, method)
);

-- API Error Tracking Table
CREATE TABLE IF NOT EXISTS api_errors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD') NOT NULL,
    status_code INT NOT NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    user_id INT NULL,
    api_key_id VARCHAR(50) NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSON COMMENT 'Sanitized request data',
    occurrence_count INT DEFAULT 1,
    first_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    INDEX idx_status_code (status_code),
    INDEX idx_error_type (error_type),
    INDEX idx_first_occurred_at (first_occurred_at),
    INDEX idx_last_occurred_at (last_occurred_at)
);

-- API SDK Downloads Table
CREATE TABLE IF NOT EXISTS api_sdk_downloads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    version VARCHAR(20),
    user_id INT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    download_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_language (language),
    INDEX idx_version (version),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- API Webhooks Table
CREATE TABLE IF NOT EXISTS api_webhooks (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL COMMENT 'Subscribed webhook events',
    secret VARCHAR(255) COMMENT 'Webhook secret for signature verification',
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INT DEFAULT 3,
    timeout_seconds INT DEFAULT 30,
    last_triggered_at TIMESTAMP NULL,
    last_success_at TIMESTAMP NULL,
    last_failure_at TIMESTAMP NULL,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_last_triggered_at (last_triggered_at)
);

-- API Webhook Deliveries Table
CREATE TABLE IF NOT EXISTS api_webhook_deliveries (
    id VARCHAR(50) PRIMARY KEY,
    webhook_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending', 'delivered', 'failed', 'retrying') DEFAULT 'pending',
    http_status_code INT NULL,
    response_body TEXT,
    attempt_count INT DEFAULT 0,
    next_retry_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (webhook_id) REFERENCES api_webhooks(id) ON DELETE CASCADE,
    INDEX idx_webhook_id (webhook_id),
    INDEX idx_event_type (event_type),
    INDEX idx_status (status),
    INDEX idx_next_retry_at (next_retry_at),
    INDEX idx_created_at (created_at)
);

-- Insert default API documentation version
INSERT IGNORE INTO api_documentation_versions (
    id, version, title, description, is_active, openapi_spec
) VALUES (
    'v1_0_0',
    '1.0.0',
    'Interviews.tv API v1.0.0',
    'Initial release of the Interviews.tv API with core functionality for interviews, users, and businesses.',
    TRUE,
    JSON_OBJECT(
        'openapi', '3.0.3',
        'info', JSON_OBJECT(
            'title', 'Interviews.tv API',
            'version', '1.0.0',
            'description', 'Comprehensive API for the Interviews.tv social networking platform'
        ),
        'servers', JSON_ARRAY(
            JSON_OBJECT('url', 'https://api.interviews.tv', 'description', 'Production server')
        )
    )
);

-- Create views for API analytics

-- API Usage Summary View
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
    endpoint,
    method,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
    ROUND(AVG(response_time), 3) as avg_response_time,
    ROUND(MIN(response_time), 3) as min_response_time,
    ROUND(MAX(response_time), 3) as max_response_time,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    DATE(created_at) as usage_date
FROM api_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY endpoint, method, DATE(created_at)
ORDER BY usage_date DESC, total_requests DESC;

-- API Performance Metrics View
CREATE OR REPLACE VIEW api_performance_metrics AS
SELECT 
    endpoint,
    method,
    COUNT(*) as request_count,
    ROUND((COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) / COUNT(*)) * 100, 2) as success_rate,
    ROUND(AVG(response_time), 3) as avg_response_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time), 3) as p95_response_time,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time), 3) as p99_response_time,
    COUNT(DISTINCT user_id) as unique_users
FROM api_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY endpoint, method
HAVING request_count >= 10
ORDER BY request_count DESC;

-- API Error Summary View
CREATE OR REPLACE VIEW api_error_summary AS
SELECT 
    endpoint,
    method,
    status_code,
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users,
    MIN(first_occurred_at) as first_occurrence,
    MAX(last_occurred_at) as last_occurrence
FROM api_errors
WHERE first_occurred_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY endpoint, method, status_code, error_type
ORDER BY error_count DESC;

-- Top API Users View
CREATE OR REPLACE VIEW top_api_users AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(al.id) as total_requests,
    COUNT(CASE WHEN al.status_code >= 200 AND al.status_code < 300 THEN 1 END) as successful_requests,
    ROUND(AVG(al.response_time), 3) as avg_response_time,
    COUNT(DISTINCT al.endpoint) as endpoints_used,
    MAX(al.created_at) as last_request_at
FROM users u
JOIN api_logs al ON u.id = al.user_id
WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id
ORDER BY total_requests DESC
LIMIT 100;

-- Create stored procedures for API analytics

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetAPIUsageStats(IN p_days INT DEFAULT 30)
BEGIN
    SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
        ROUND(AVG(response_time), 3) as avg_response_time,
        COUNT(DISTINCT endpoint) as endpoints_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        ROUND((COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) / COUNT(*)) * 100, 2) as success_rate
    FROM api_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY);
END//

CREATE PROCEDURE IF NOT EXISTS GetEndpointPerformance(IN p_endpoint VARCHAR(255), IN p_days INT DEFAULT 7)
BEGIN
    SELECT 
        DATE(created_at) as date,
        method,
        COUNT(*) as requests,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed,
        ROUND(AVG(response_time), 3) as avg_response_time,
        ROUND(MIN(response_time), 3) as min_response_time,
        ROUND(MAX(response_time), 3) as max_response_time
    FROM api_logs
    WHERE endpoint = p_endpoint
    AND created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    GROUP BY DATE(created_at), method
    ORDER BY date DESC, method;
END//

CREATE PROCEDURE IF NOT EXISTS UpdateDailyAPIStats()
BEGIN
    INSERT INTO api_usage_statistics (
        date, endpoint, method, total_requests, successful_requests, failed_requests,
        avg_response_time, min_response_time, max_response_time, total_data_transferred,
        unique_users, unique_ips
    )
    SELECT 
        DATE(created_at) as date,
        endpoint,
        method,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
        AVG(response_time) as avg_response_time,
        MIN(response_time) as min_response_time,
        MAX(response_time) as max_response_time,
        SUM(request_size + response_size) as total_data_transferred,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips
    FROM api_logs
    WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
    GROUP BY DATE(created_at), endpoint, method
    ON DUPLICATE KEY UPDATE
        total_requests = VALUES(total_requests),
        successful_requests = VALUES(successful_requests),
        failed_requests = VALUES(failed_requests),
        avg_response_time = VALUES(avg_response_time),
        min_response_time = VALUES(min_response_time),
        max_response_time = VALUES(max_response_time),
        total_data_transferred = VALUES(total_data_transferred),
        unique_users = VALUES(unique_users),
        unique_ips = VALUES(unique_ips);
END//

DELIMITER ;

-- Create triggers for automatic logging

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_api_key_use
AFTER INSERT ON api_logs
FOR EACH ROW
BEGIN
    IF NEW.api_key_id IS NOT NULL THEN
        UPDATE api_keys 
        SET last_used_at = NEW.created_at
        WHERE id = NEW.api_key_id;
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS after_api_error_insert
AFTER INSERT ON api_logs
FOR EACH ROW
BEGIN
    IF NEW.status_code >= 400 THEN
        INSERT INTO api_errors (
            endpoint, method, status_code, error_message, user_id, 
            api_key_id, ip_address, user_agent, first_occurred_at
        ) VALUES (
            NEW.endpoint, NEW.method, NEW.status_code, NEW.error_message,
            NEW.user_id, NEW.api_key_id, NEW.ip_address, NEW.user_agent, NEW.created_at
        )
        ON DUPLICATE KEY UPDATE
            occurrence_count = occurrence_count + 1,
            last_occurred_at = NEW.created_at;
    END IF;
END//

DELIMITER ;

-- Add API-related columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_access_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS api_rate_limit_override INT NULL,
ADD COLUMN IF NOT EXISTS api_last_used_at TIMESTAMP NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_api_access ON users(api_access_enabled);
CREATE INDEX IF NOT EXISTS idx_users_api_last_used ON users(api_last_used_at);

-- Create event scheduler for daily statistics update
-- Note: This requires SUPER privileges and event_scheduler to be ON
-- SET GLOBAL event_scheduler = ON;

-- CREATE EVENT IF NOT EXISTS daily_api_stats_update
-- ON SCHEDULE EVERY 1 DAY
-- STARTS TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '01:00:00')
-- DO
--   CALL UpdateDailyAPIStats();
