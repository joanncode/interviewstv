-- Webhook Notifications System Tables
-- Migration: 021_create_webhook_notifications_tables_sqlite.sql

-- Webhook endpoints configuration
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    endpoint_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT, -- encrypted webhook secret for signature verification
    is_active BOOLEAN DEFAULT 1,
    description TEXT,
    headers TEXT, -- JSON custom headers
    timeout_seconds INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    failure_threshold INTEGER DEFAULT 5, -- disable after X consecutive failures
    consecutive_failures INTEGER DEFAULT 0,
    last_success_at DATETIME,
    last_failure_at DATETIME,
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook event types and subscriptions
CREATE TABLE IF NOT EXISTS webhook_event_types (
    event_type_id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL UNIQUE,
    event_category TEXT NOT NULL, -- interview, user, system, integration, streaming, etc.
    description TEXT,
    payload_schema TEXT, -- JSON schema for the event payload
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User webhook subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    subscription_id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    event_type_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    filter_conditions TEXT, -- JSON conditions for filtering events
    transform_template TEXT, -- JSON template for payload transformation
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(endpoint_id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES webhook_event_types(event_type_id),
    UNIQUE(endpoint_id, event_type_id)
);

-- Webhook delivery queue and history
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    event_type_id TEXT NOT NULL,
    event_id TEXT, -- reference to the original event
    payload TEXT NOT NULL, -- JSON payload
    headers TEXT, -- JSON headers sent
    status TEXT DEFAULT 'pending', -- pending, delivered, failed, cancelled
    http_status_code INTEGER,
    response_body TEXT,
    response_headers TEXT, -- JSON response headers
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_attempted_at DATETIME,
    last_attempted_at DATETIME,
    delivered_at DATETIME,
    failed_at DATETIME,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(endpoint_id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES webhook_event_types(event_type_id)
);

-- Webhook delivery attempts log
CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
    attempt_id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    http_status_code INTEGER,
    response_body TEXT,
    response_headers TEXT, -- JSON response headers
    error_message TEXT,
    processing_time_ms INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (delivery_id) REFERENCES webhook_deliveries(delivery_id) ON DELETE CASCADE
);

-- Webhook security and rate limiting
CREATE TABLE IF NOT EXISTS webhook_security_logs (
    log_id TEXT PRIMARY KEY,
    endpoint_id TEXT,
    event_type TEXT NOT NULL, -- signature_verification_failed, rate_limit_exceeded, suspicious_activity
    ip_address TEXT,
    user_agent TEXT,
    request_headers TEXT, -- JSON request headers
    request_body TEXT,
    severity TEXT DEFAULT 'medium', -- low, medium, high, critical
    description TEXT,
    blocked BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(endpoint_id) ON DELETE SET NULL
);

-- Webhook analytics and metrics
CREATE TABLE IF NOT EXISTS webhook_analytics (
    analytics_id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    event_type_id TEXT,
    date_period DATE NOT NULL,
    total_events INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    average_response_time_ms REAL DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    total_retries INTEGER DEFAULT 0,
    unique_event_types INTEGER DEFAULT 0,
    data_volume_bytes INTEGER DEFAULT 0,
    uptime_percentage REAL DEFAULT 100.0,
    error_rate_percentage REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(endpoint_id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES webhook_event_types(event_type_id),
    UNIQUE(endpoint_id, event_type_id, date_period)
);

-- Webhook configuration templates
CREATE TABLE IF NOT EXISTS webhook_templates (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- integration, monitoring, analytics, custom
    endpoint_template TEXT, -- JSON template for endpoint configuration
    event_subscriptions TEXT, -- JSON array of default event subscriptions
    payload_template TEXT, -- JSON template for payload transformation
    headers_template TEXT, -- JSON template for custom headers
    is_public BOOLEAN DEFAULT 0,
    created_by INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Event queue for webhook processing
CREATE TABLE IF NOT EXISTS webhook_event_queue (
    queue_id TEXT PRIMARY KEY,
    event_type_id TEXT NOT NULL,
    event_data TEXT NOT NULL, -- JSON event data
    entity_type TEXT, -- interview, user, stream, etc.
    entity_id TEXT,
    user_id INTEGER,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    scheduled_for DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_type_id) REFERENCES webhook_event_types(event_type_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook rate limiting
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
    rate_limit_id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    time_window_minutes INTEGER DEFAULT 60,
    max_requests INTEGER DEFAULT 1000,
    current_requests INTEGER DEFAULT 0,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT 0,
    blocked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(endpoint_id) ON DELETE CASCADE,
    UNIQUE(endpoint_id, time_window_minutes)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_endpoint ON webhook_subscriptions(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_type ON webhook_subscriptions(event_type_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_delivery ON webhook_delivery_attempts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_attempted ON webhook_delivery_attempts(attempted_at);

CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_endpoint ON webhook_security_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_event_type ON webhook_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created ON webhook_security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_analytics_endpoint ON webhook_analytics(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_date ON webhook_analytics(date_period);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_event_type ON webhook_analytics(event_type_id);

CREATE INDEX IF NOT EXISTS idx_webhook_event_queue_status ON webhook_event_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_webhook_event_queue_user ON webhook_event_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_event_queue_priority ON webhook_event_queue(priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_endpoint ON webhook_rate_limits(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_window ON webhook_rate_limits(window_start);

-- Insert default webhook event types
INSERT OR IGNORE INTO webhook_event_types (event_type_id, event_name, event_category, description, payload_schema) VALUES
-- Interview Events
('interview.created', 'Interview Created', 'interview', 'Triggered when a new interview is created', '{"type":"object","properties":{"interview_id":{"type":"string"},"title":{"type":"string"},"host_id":{"type":"integer"},"guest_id":{"type":"integer"},"scheduled_at":{"type":"string","format":"date-time"}}}'),
('interview.started', 'Interview Started', 'interview', 'Triggered when an interview begins', '{"type":"object","properties":{"interview_id":{"type":"string"},"started_at":{"type":"string","format":"date-time"},"participants":{"type":"array"}}}'),
('interview.ended', 'Interview Ended', 'interview', 'Triggered when an interview ends', '{"type":"object","properties":{"interview_id":{"type":"string"},"ended_at":{"type":"string","format":"date-time"},"duration_minutes":{"type":"integer"}}}'),
('interview.recording_ready', 'Interview Recording Ready', 'interview', 'Triggered when interview recording is processed and ready', '{"type":"object","properties":{"interview_id":{"type":"string"},"recording_url":{"type":"string"},"duration_seconds":{"type":"integer"}}}'),

-- User Events
('user.registered', 'User Registered', 'user', 'Triggered when a new user registers', '{"type":"object","properties":{"user_id":{"type":"integer"},"email":{"type":"string"},"username":{"type":"string"},"registered_at":{"type":"string","format":"date-time"}}}'),
('user.profile_updated', 'User Profile Updated', 'user', 'Triggered when user updates their profile', '{"type":"object","properties":{"user_id":{"type":"integer"},"updated_fields":{"type":"array"},"updated_at":{"type":"string","format":"date-time"}}}'),
('user.subscription_changed', 'User Subscription Changed', 'user', 'Triggered when user subscription status changes', '{"type":"object","properties":{"user_id":{"type":"integer"},"old_plan":{"type":"string"},"new_plan":{"type":"string"},"changed_at":{"type":"string","format":"date-time"}}}'),

-- Streaming Events
('stream.started', 'Stream Started', 'streaming', 'Triggered when a live stream begins', '{"type":"object","properties":{"stream_id":{"type":"string"},"platform":{"type":"string"},"started_at":{"type":"string","format":"date-time"},"viewer_count":{"type":"integer"}}}'),
('stream.ended', 'Stream Ended', 'streaming', 'Triggered when a live stream ends', '{"type":"object","properties":{"stream_id":{"type":"string"},"platform":{"type":"string"},"ended_at":{"type":"string","format":"date-time"},"total_viewers":{"type":"integer"},"duration_minutes":{"type":"integer"}}}'),
('stream.viewer_milestone', 'Stream Viewer Milestone', 'streaming', 'Triggered when stream reaches viewer milestones', '{"type":"object","properties":{"stream_id":{"type":"string"},"milestone":{"type":"integer"},"current_viewers":{"type":"integer"},"reached_at":{"type":"string","format":"date-time"}}}'),

-- AI Events
('ai.transcription_complete', 'AI Transcription Complete', 'ai', 'Triggered when AI transcription is completed', '{"type":"object","properties":{"interview_id":{"type":"string"},"transcription_id":{"type":"string"},"language":{"type":"string"},"confidence_score":{"type":"number"}}}'),
('ai.analysis_complete', 'AI Analysis Complete', 'ai', 'Triggered when AI analysis is completed', '{"type":"object","properties":{"interview_id":{"type":"string"},"analysis_type":{"type":"string"},"results":{"type":"object"},"completed_at":{"type":"string","format":"date-time"}}}'),
('ai.sentiment_alert', 'AI Sentiment Alert', 'ai', 'Triggered when AI detects significant sentiment changes', '{"type":"object","properties":{"interview_id":{"type":"string"},"sentiment_score":{"type":"number"},"alert_type":{"type":"string"},"detected_at":{"type":"string","format":"date-time"}}}'),

-- System Events
('system.maintenance_scheduled', 'System Maintenance Scheduled', 'system', 'Triggered when system maintenance is scheduled', '{"type":"object","properties":{"maintenance_id":{"type":"string"},"scheduled_start":{"type":"string","format":"date-time"},"estimated_duration_minutes":{"type":"integer"},"affected_services":{"type":"array"}}}'),
('system.error_threshold_exceeded', 'System Error Threshold Exceeded', 'system', 'Triggered when system error rate exceeds threshold', '{"type":"object","properties":{"service":{"type":"string"},"error_rate":{"type":"number"},"threshold":{"type":"number"},"time_window":{"type":"string"}}}'),
('system.backup_completed', 'System Backup Completed', 'system', 'Triggered when system backup is completed', '{"type":"object","properties":{"backup_id":{"type":"string"},"backup_type":{"type":"string"},"size_bytes":{"type":"integer"},"completed_at":{"type":"string","format":"date-time"}}}'),

-- Integration Events
('integration.connected', 'Integration Connected', 'integration', 'Triggered when a new integration is connected', '{"type":"object","properties":{"integration_id":{"type":"string"},"platform":{"type":"string"},"user_id":{"type":"integer"},"connected_at":{"type":"string","format":"date-time"}}}'),
('integration.disconnected', 'Integration Disconnected', 'integration', 'Triggered when an integration is disconnected', '{"type":"object","properties":{"integration_id":{"type":"string"},"platform":{"type":"string"},"user_id":{"type":"integer"},"disconnected_at":{"type":"string","format":"date-time"},"reason":{"type":"string"}}}'),
('integration.sync_completed', 'Integration Sync Completed', 'integration', 'Triggered when integration sync is completed', '{"type":"object","properties":{"integration_id":{"type":"string"},"platform":{"type":"string"},"sync_type":{"type":"string"},"items_synced":{"type":"integer"},"completed_at":{"type":"string","format":"date-time"}}}');

-- Insert default webhook templates
INSERT OR IGNORE INTO webhook_templates (template_id, name, description, category, endpoint_template, event_subscriptions, payload_template, headers_template, is_public) VALUES
('slack_notifications', 'Slack Notifications', 'Send interview notifications to Slack channels', 'integration', 
 '{"url":"https://example.com/webhook/slack-notifications","timeout_seconds":30,"retry_attempts":3}',
 '["interview.created","interview.started","interview.ended","interview.recording_ready"]',
 '{"text":"{{event_name}}: {{interview.title}}","channel":"#interviews","username":"Interviews.tv"}',
 '{"Content-Type":"application/json"}', 1),

('discord_notifications', 'Discord Notifications', 'Send interview notifications to Discord channels', 'integration',
 '{"url":"https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK","timeout_seconds":30,"retry_attempts":3}',
 '["interview.created","interview.started","interview.ended","stream.started"]',
 '{"content":"**{{event_name}}**: {{interview.title}}","username":"Interviews.tv"}',
 '{"Content-Type":"application/json"}', 1),

('zapier_integration', 'Zapier Integration', 'Connect with Zapier for workflow automation', 'integration',
 '{"url":"https://hooks.zapier.com/hooks/catch/YOUR/ZAPIER/HOOK","timeout_seconds":45,"retry_attempts":5}',
 '["interview.created","interview.ended","user.registered","ai.analysis_complete"]',
 '{"event":"{{event_name}}","data":{{event_data}},"timestamp":"{{timestamp}}"}',
 '{"Content-Type":"application/json","X-Source":"Interviews.tv"}', 1),

('custom_analytics', 'Custom Analytics', 'Send events to custom analytics platform', 'analytics',
 '{"url":"https://your-analytics-platform.com/webhook","timeout_seconds":30,"retry_attempts":3}',
 '["interview.started","interview.ended","stream.started","stream.ended","user.registered"]',
 '{"event_type":"{{event_name}}","properties":{{event_data}},"user_id":"{{user_id}}","timestamp":"{{timestamp}}"}',
 '{"Content-Type":"application/json","Authorization":"Bearer YOUR_API_KEY"}', 1);
