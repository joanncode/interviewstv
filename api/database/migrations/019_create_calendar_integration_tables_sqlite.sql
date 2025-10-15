-- Calendar Integration System Tables
-- Migration: 019_create_calendar_integration_tables_sqlite.sql

-- Calendar providers and user connections
CREATE TABLE IF NOT EXISTS calendar_providers (
    provider_id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL, -- google, outlook, apple, caldav, exchange
    api_endpoint TEXT,
    auth_endpoint TEXT,
    token_endpoint TEXT,
    scopes TEXT, -- JSON array of required scopes
    client_id TEXT,
    client_secret TEXT, -- encrypted
    is_active BOOLEAN DEFAULT 1,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    configuration TEXT, -- JSON provider-specific configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User calendar connections
CREATE TABLE IF NOT EXISTS user_calendar_connections (
    connection_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider_id TEXT NOT NULL,
    external_calendar_id TEXT, -- calendar ID from the provider
    calendar_name TEXT,
    calendar_description TEXT,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at DATETIME,
    is_primary BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sync_enabled BOOLEAN DEFAULT 1,
    sync_direction TEXT DEFAULT 'bidirectional', -- read_only, write_only, bidirectional
    last_sync_at DATETIME,
    sync_status TEXT DEFAULT 'pending', -- pending, syncing, completed, failed
    sync_error_message TEXT,
    permissions TEXT, -- JSON array of granted permissions
    settings TEXT, -- JSON user-specific settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES calendar_providers(provider_id)
);

-- Calendar events (local copy with sync mapping)
CREATE TABLE IF NOT EXISTS calendar_events (
    event_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    external_event_id TEXT, -- event ID from the provider
    interview_id TEXT, -- link to interviews table if applicable
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT 0,
    recurrence_rule TEXT, -- RRULE format
    recurrence_exceptions TEXT, -- JSON array of exception dates
    status TEXT DEFAULT 'confirmed', -- tentative, confirmed, cancelled
    visibility TEXT DEFAULT 'default', -- default, public, private, confidential
    attendees TEXT, -- JSON array of attendees
    organizer_email TEXT,
    meeting_url TEXT,
    meeting_id TEXT,
    meeting_password TEXT,
    reminders TEXT, -- JSON array of reminder settings
    attachments TEXT, -- JSON array of attachments
    custom_properties TEXT, -- JSON custom properties
    last_modified DATETIME,
    sync_status TEXT DEFAULT 'pending', -- pending, synced, conflict, failed
    sync_direction TEXT, -- from_provider, to_provider, bidirectional
    sync_error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_calendar_connections(connection_id) ON DELETE CASCADE
);

-- Calendar sync operations log
CREATE TABLE IF NOT EXISTS calendar_sync_operations (
    operation_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- full_sync, incremental_sync, event_create, event_update, event_delete
    operation_status TEXT DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    events_processed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_deleted INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_seconds INTEGER,
    error_details TEXT, -- JSON error information
    sync_token TEXT, -- provider sync token for incremental sync
    next_sync_token TEXT, -- next sync token from provider
    metadata TEXT, -- JSON operation metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_calendar_connections(connection_id) ON DELETE CASCADE
);

-- Calendar event conflicts and resolutions
CREATE TABLE IF NOT EXISTS calendar_event_conflicts (
    conflict_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    conflict_type TEXT NOT NULL, -- time_overlap, duplicate_event, sync_conflict, validation_error
    conflict_description TEXT,
    local_event_data TEXT, -- JSON local event data
    remote_event_data TEXT, -- JSON remote event data
    resolution_strategy TEXT, -- manual, prefer_local, prefer_remote, merge, skip
    resolution_status TEXT DEFAULT 'pending', -- pending, resolved, ignored
    resolved_by_user_id INTEGER,
    resolved_at DATETIME,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Calendar availability and free/busy information
CREATE TABLE IF NOT EXISTS calendar_availability (
    availability_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    working_hours TEXT, -- JSON working hours per day
    busy_periods TEXT, -- JSON array of busy time periods
    free_periods TEXT, -- JSON array of free time periods
    availability_rules TEXT, -- JSON availability rules and preferences
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_calendar_connections(connection_id) ON DELETE SET NULL
);

-- Calendar integration settings and preferences
CREATE TABLE IF NOT EXISTS calendar_integration_settings (
    setting_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    setting_category TEXT NOT NULL, -- sync, notifications, availability, scheduling
    setting_key TEXT NOT NULL,
    setting_value TEXT, -- JSON value
    is_encrypted BOOLEAN DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, setting_category, setting_key)
);

-- Calendar webhooks for real-time updates
CREATE TABLE IF NOT EXISTS calendar_webhooks (
    webhook_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    provider_webhook_id TEXT, -- webhook ID from the provider
    webhook_url TEXT NOT NULL,
    webhook_secret TEXT, -- encrypted
    event_types TEXT, -- JSON array of subscribed event types
    is_active BOOLEAN DEFAULT 1,
    last_notification_at DATETIME,
    notification_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_calendar_connections(connection_id) ON DELETE CASCADE
);

-- Calendar integration analytics
CREATE TABLE IF NOT EXISTS calendar_integration_analytics (
    analytics_id TEXT PRIMARY KEY,
    user_id INTEGER,
    provider_id TEXT,
    date_period DATE NOT NULL,
    sync_operations_count INTEGER DEFAULT 0,
    events_synced_count INTEGER DEFAULT 0,
    conflicts_resolved_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    average_sync_duration_seconds REAL DEFAULT 0,
    success_rate REAL DEFAULT 0,
    user_satisfaction_rating INTEGER, -- 1-5 rating
    performance_metrics TEXT, -- JSON performance data
    usage_patterns TEXT, -- JSON usage pattern analysis
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES calendar_providers(provider_id) ON DELETE SET NULL
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_user ON user_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_provider ON user_calendar_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_active ON user_calendar_connections(is_active, sync_enabled);
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_sync ON user_calendar_connections(last_sync_at, sync_status);

CREATE INDEX IF NOT EXISTS idx_calendar_events_connection ON calendar_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_interview ON calendar_events(interview_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync ON calendar_events(sync_status, sync_direction);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_operations_connection ON calendar_sync_operations(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_operations_status ON calendar_sync_operations(operation_status, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_operations_type ON calendar_sync_operations(operation_type, start_time);

CREATE INDEX IF NOT EXISTS idx_calendar_event_conflicts_event ON calendar_event_conflicts(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_conflicts_status ON calendar_event_conflicts(resolution_status, conflict_type);

CREATE INDEX IF NOT EXISTS idx_calendar_availability_user ON calendar_availability(user_id, date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_connection ON calendar_availability(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_expires ON calendar_availability(expires_at);

CREATE INDEX IF NOT EXISTS idx_calendar_integration_settings_user ON calendar_integration_settings(user_id, setting_category);
CREATE INDEX IF NOT EXISTS idx_calendar_integration_settings_key ON calendar_integration_settings(setting_key);

CREATE INDEX IF NOT EXISTS idx_calendar_webhooks_connection ON calendar_webhooks(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_webhooks_active ON calendar_webhooks(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_calendar_integration_analytics_user ON calendar_integration_analytics(user_id, date_period);
CREATE INDEX IF NOT EXISTS idx_calendar_integration_analytics_provider ON calendar_integration_analytics(provider_id, date_period);

-- Insert default calendar providers
INSERT OR IGNORE INTO calendar_providers (provider_id, provider_name, provider_type, api_endpoint, auth_endpoint, token_endpoint, scopes, is_active) VALUES
('google_calendar', 'Google Calendar', 'google', 'https://www.googleapis.com/calendar/v3', 'https://accounts.google.com/o/oauth2/auth', 'https://oauth2.googleapis.com/token', '["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]', 1),

('outlook_calendar', 'Microsoft Outlook', 'outlook', 'https://graph.microsoft.com/v1.0', 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token', '["https://graph.microsoft.com/calendars.readwrite", "https://graph.microsoft.com/user.read"]', 1),

('office365_calendar', 'Office 365 Calendar', 'outlook', 'https://graph.microsoft.com/v1.0', 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token', '["https://graph.microsoft.com/calendars.readwrite", "https://graph.microsoft.com/user.read"]', 1),

('apple_calendar', 'Apple Calendar (iCloud)', 'apple', 'https://caldav.icloud.com', null, null, '[]', 1),

('caldav_generic', 'Generic CalDAV', 'caldav', null, null, null, '[]', 1);

-- Insert sample calendar integration settings
INSERT OR IGNORE INTO calendar_integration_settings (setting_id, user_id, setting_category, setting_key, setting_value, description) VALUES
('default_sync_frequency', 1, 'sync', 'sync_frequency_minutes', '15', 'Default sync frequency in minutes'),
('default_sync_direction', 1, 'sync', 'default_sync_direction', '"bidirectional"', 'Default sync direction for new connections'),
('default_conflict_resolution', 1, 'sync', 'conflict_resolution_strategy', '"manual"', 'Default conflict resolution strategy'),
('notification_preferences', 1, 'notifications', 'email_notifications', 'true', 'Enable email notifications for sync events'),
('availability_buffer', 1, 'availability', 'buffer_time_minutes', '15', 'Buffer time between meetings in minutes'),
('working_hours_default', 1, 'availability', 'default_working_hours', '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}}', 'Default working hours configuration');
