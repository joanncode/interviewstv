-- API Documentation and Analytics Tables
-- Migration: 026_create_api_documentation_tables_sqlite.sql
-- Description: Create tables for API documentation, usage tracking, and developer analytics

-- API Endpoints Registry
CREATE TABLE IF NOT EXISTS api_endpoints (
    endpoint_id VARCHAR(50) PRIMARY KEY,
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    version VARCHAR(20) DEFAULT 'v1',
    is_deprecated BOOLEAN DEFAULT FALSE,
    rate_limit_per_minute INTEGER DEFAULT 60,
    requires_auth BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Documentation Sections
CREATE TABLE IF NOT EXISTS api_documentation_sections (
    section_id VARCHAR(50) PRIMARY KEY,
    section_name VARCHAR(255) NOT NULL,
    section_description TEXT,
    icon_class VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Parameters Documentation
CREATE TABLE IF NOT EXISTS api_parameters (
    parameter_id VARCHAR(50) PRIMARY KEY,
    endpoint_id VARCHAR(50) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    parameter_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    description TEXT,
    example_value TEXT,
    validation_rules TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE
);

-- API Response Examples
CREATE TABLE IF NOT EXISTS api_response_examples (
    example_id VARCHAR(50) PRIMARY KEY,
    endpoint_id VARCHAR(50) NOT NULL,
    status_code INTEGER NOT NULL,
    response_description VARCHAR(255),
    example_response TEXT,
    content_type VARCHAR(100) DEFAULT 'application/json',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE
);

-- API Usage Analytics
CREATE TABLE IF NOT EXISTS api_usage_analytics (
    analytics_id VARCHAR(50) PRIMARY KEY,
    endpoint_id VARCHAR(50) NOT NULL,
    user_id INTEGER,
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_agent TEXT,
    ip_address VARCHAR(45),
    api_key_id VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE
);

-- API Keys Management
CREATE TABLE IF NOT EXISTS api_keys (
    api_key_id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(20) NOT NULL,
    permissions TEXT, -- JSON array of allowed endpoints/scopes
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Rate Limiting
CREATE TABLE IF NOT EXISTS api_rate_limits (
    rate_limit_id VARCHAR(50) PRIMARY KEY,
    api_key_id VARCHAR(50) NOT NULL,
    endpoint_id VARCHAR(50),
    time_window VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(api_key_id) ON DELETE CASCADE,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE
);

-- API Documentation Views/Visits
CREATE TABLE IF NOT EXISTS api_documentation_views (
    view_id VARCHAR(50) PRIMARY KEY,
    section_id VARCHAR(50),
    endpoint_id VARCHAR(50),
    user_id INTEGER,
    session_id VARCHAR(100),
    view_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER,
    user_agent TEXT,
    ip_address VARCHAR(45),
    referrer_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES api_documentation_sections(section_id) ON DELETE SET NULL,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE SET NULL
);

-- API Error Logs
CREATE TABLE IF NOT EXISTS api_error_logs (
    error_id VARCHAR(50) PRIMARY KEY,
    endpoint_id VARCHAR(50),
    user_id INTEGER,
    api_key_id VARCHAR(50),
    error_code VARCHAR(50),
    error_message TEXT,
    error_details TEXT, -- JSON with stack trace, request data, etc.
    request_method VARCHAR(10),
    request_path VARCHAR(255),
    request_headers TEXT,
    request_body TEXT,
    response_status INTEGER,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE SET NULL,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(api_key_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_endpoint_timestamp ON api_usage_analytics(endpoint_id, request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_user_timestamp ON api_usage_analytics(user_id, request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window ON api_rate_limits(api_key_id, time_window, window_start);
CREATE INDEX IF NOT EXISTS idx_api_documentation_views_timestamp ON api_documentation_views(view_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_occurred_at ON api_error_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active);

-- Insert default API documentation sections
INSERT OR IGNORE INTO api_documentation_sections (section_id, section_name, section_description, icon_class, sort_order) VALUES
('calendar', 'Calendar Integration', 'Manage calendar connections and synchronize interview schedules with Google Calendar and Outlook.', 'fas fa-calendar-alt', 1),
('social-media', 'Social Media Streaming', 'Stream interviews to social media platforms like YouTube, Facebook, and LinkedIn.', 'fas fa-share-alt', 2),
('webhooks', 'Webhook Notifications', 'Configure and manage webhook notifications for interview events and system updates.', 'fas fa-bell', 3),
('third-party', 'Third-Party Integrations', 'Connect with business tools like Slack, Discord, Zoom, Notion, and more.', 'fas fa-plug', 4),
('crm', 'CRM Connections', 'Integrate with CRM systems like Salesforce, HubSpot, Pipedrive, and more.', 'fas fa-handshake', 5),
('payment', 'Payment Gateway', 'Process payments, manage subscriptions, and handle financial transactions.', 'fas fa-credit-card', 6);

-- Insert sample API endpoints for calendar integration
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('calendar_get_providers', 'GET', '/api/calendar/providers', 'Get Calendar Providers', 'Retrieve available calendar providers (Google, Outlook, etc.)', 'calendar', 'v1'),
('calendar_connect', 'POST', '/api/calendar/connect', 'Connect Calendar Provider', 'Create OAuth authorization URL for calendar provider connection', 'calendar', 'v1'),
('calendar_get_connections', 'GET', '/api/calendar/connections', 'Get Calendar Connections', 'Retrieve user''s connected calendar accounts', 'calendar', 'v1'),
('calendar_sync_events', 'POST', '/api/calendar/events/sync', 'Sync Calendar Events', 'Synchronize interview events with connected calendar', 'calendar', 'v1');

-- Insert sample API endpoints for social media streaming
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('social_get_platforms', 'GET', '/api/social/platforms', 'Get Social Platforms', 'Retrieve available social media streaming platforms', 'social-media', 'v1'),
('social_connect', 'POST', '/api/social/connect', 'Connect Social Platform', 'Connect to a social media platform for streaming', 'social-media', 'v1'),
('social_start_stream', 'POST', '/api/social/stream/start', 'Start Live Stream', 'Start streaming interview to social media platform', 'social-media', 'v1');

-- Insert sample API endpoints for webhooks
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('webhooks_get', 'GET', '/api/webhooks', 'Get Webhooks', 'Retrieve configured webhook endpoints', 'webhooks', 'v1'),
('webhooks_create', 'POST', '/api/webhooks', 'Create Webhook', 'Create a new webhook endpoint', 'webhooks', 'v1'),
('webhooks_update', 'PUT', '/api/webhooks/{id}', 'Update Webhook', 'Update an existing webhook endpoint', 'webhooks', 'v1'),
('webhooks_delete', 'DELETE', '/api/webhooks/{id}', 'Delete Webhook', 'Delete a webhook endpoint', 'webhooks', 'v1');

-- Insert sample API endpoints for third-party integrations
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('integrations_get_apps', 'GET', '/api/integrations/apps', 'Get Available Apps', 'Retrieve available third-party applications for integration', 'third-party', 'v1'),
('integrations_connect', 'POST', '/api/integrations/connect', 'Connect Third-Party App', 'Connect to a third-party application', 'third-party', 'v1');

-- Insert sample API endpoints for CRM connections
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('crm_get_providers', 'GET', '/api/crm/providers', 'Get CRM Providers', 'Retrieve available CRM providers', 'crm', 'v1'),
('crm_sync_contacts', 'POST', '/api/crm/sync/contacts', 'Sync CRM Contacts', 'Synchronize contacts with CRM system', 'crm', 'v1');

-- Insert sample API endpoints for payment gateway
INSERT OR IGNORE INTO api_endpoints (endpoint_id, method, path, title, description, category, version) VALUES
('payment_get_providers', 'GET', '/api/payment/providers', 'Get Payment Providers', 'Retrieve available payment providers', 'payment', 'v1'),
('payment_process', 'POST', '/api/payment/process', 'Process Payment', 'Process a payment transaction', 'payment', 'v1'),
('payment_create_subscription', 'POST', '/api/payment/subscriptions', 'Create Subscription', 'Create a customer subscription', 'payment', 'v1');
