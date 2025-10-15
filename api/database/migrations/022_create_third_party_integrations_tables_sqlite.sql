-- Third-Party App Integrations System Tables
-- Migration: 022_create_third_party_integrations_tables_sqlite.sql

-- Third-party application definitions
CREATE TABLE IF NOT EXISTS third_party_apps (
    app_id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    app_category TEXT NOT NULL, -- communication, productivity, video, storage, analytics, etc.
    app_description TEXT,
    app_icon_url TEXT,
    app_website_url TEXT,
    oauth_provider TEXT, -- oauth2, oauth1, api_key, custom
    oauth_authorize_url TEXT,
    oauth_token_url TEXT,
    oauth_scopes TEXT, -- JSON array of available scopes
    api_base_url TEXT,
    api_version TEXT,
    rate_limit_requests INTEGER DEFAULT 1000,
    rate_limit_window_minutes INTEGER DEFAULT 60,
    webhook_support BOOLEAN DEFAULT 0,
    webhook_events TEXT, -- JSON array of supported webhook events
    status TEXT DEFAULT 'active', -- active, deprecated, maintenance
    documentation_url TEXT,
    support_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User app connections and configurations
CREATE TABLE IF NOT EXISTS user_app_connections (
    connection_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    app_id TEXT NOT NULL,
    connection_name TEXT, -- user-defined name for this connection
    oauth_state TEXT, -- for OAuth flow security
    access_token TEXT, -- encrypted OAuth access token
    refresh_token TEXT, -- encrypted OAuth refresh token
    token_expires_at DATETIME,
    granted_scopes TEXT, -- JSON array of granted scopes
    connection_metadata TEXT, -- JSON metadata (user info, workspace info, etc.)
    is_active BOOLEAN DEFAULT 1,
    auto_refresh BOOLEAN DEFAULT 1,
    last_used_at DATETIME,
    last_sync_at DATETIME,
    sync_frequency_minutes INTEGER DEFAULT 60,
    error_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    last_error_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (app_id) REFERENCES third_party_apps(app_id) ON DELETE CASCADE
);

-- Integration workflows and automations
CREATE TABLE IF NOT EXISTS integration_workflows (
    workflow_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    workflow_name TEXT NOT NULL,
    workflow_description TEXT,
    trigger_type TEXT NOT NULL, -- event, schedule, manual, webhook
    trigger_config TEXT, -- JSON configuration for trigger
    is_active BOOLEAN DEFAULT 1,
    execution_count INTEGER DEFAULT 0,
    last_execution_at DATETIME,
    last_execution_status TEXT, -- success, failed, partial
    last_execution_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workflow actions and steps
CREATE TABLE IF NOT EXISTS workflow_actions (
    action_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- send_message, create_meeting, upload_file, etc.
    action_config TEXT NOT NULL, -- JSON configuration for action
    execution_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 300,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES integration_workflows(workflow_id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE
);

-- Workflow execution history
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    trigger_data TEXT, -- JSON data that triggered the workflow
    execution_status TEXT DEFAULT 'running', -- running, completed, failed, cancelled
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    total_actions INTEGER DEFAULT 0,
    successful_actions INTEGER DEFAULT 0,
    failed_actions INTEGER DEFAULT 0,
    execution_log TEXT, -- JSON log of execution steps
    error_message TEXT,
    FOREIGN KEY (workflow_id) REFERENCES integration_workflows(workflow_id) ON DELETE CASCADE
);

-- Action execution details
CREATE TABLE IF NOT EXISTS action_executions (
    action_execution_id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    execution_status TEXT DEFAULT 'pending', -- pending, running, completed, failed, skipped
    started_at DATETIME,
    completed_at DATETIME,
    attempt_count INTEGER DEFAULT 0,
    response_data TEXT, -- JSON response from the action
    error_message TEXT,
    processing_time_ms INTEGER,
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES workflow_actions(action_id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE
);

-- App usage analytics and metrics
CREATE TABLE IF NOT EXISTS app_usage_analytics (
    analytics_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    app_id TEXT NOT NULL,
    connection_id TEXT,
    date_period DATE NOT NULL,
    api_calls_count INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    total_data_transferred_bytes INTEGER DEFAULT 0,
    average_response_time_ms REAL DEFAULT 0,
    workflow_executions INTEGER DEFAULT 0,
    successful_workflows INTEGER DEFAULT 0,
    error_rate_percentage REAL DEFAULT 0,
    uptime_percentage REAL DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (app_id) REFERENCES third_party_apps(app_id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE SET NULL,
    UNIQUE(user_id, app_id, connection_id, date_period)
);

-- Integration templates and presets
CREATE TABLE IF NOT EXISTS integration_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_description TEXT,
    template_category TEXT NOT NULL, -- communication, productivity, automation, etc.
    app_id TEXT NOT NULL,
    template_config TEXT NOT NULL, -- JSON template configuration
    required_scopes TEXT, -- JSON array of required OAuth scopes
    is_public BOOLEAN DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    rating_average REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES third_party_apps(app_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- App rate limiting and quotas
CREATE TABLE IF NOT EXISTS app_rate_limits (
    rate_limit_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    time_window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_window_minutes INTEGER DEFAULT 60,
    requests_made INTEGER DEFAULT 0,
    requests_limit INTEGER DEFAULT 1000,
    is_throttled BOOLEAN DEFAULT 0,
    throttled_until DATETIME,
    reset_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, time_window_start)
);

-- App synchronization status
CREATE TABLE IF NOT EXISTS app_sync_status (
    sync_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    sync_type TEXT NOT NULL, -- full, incremental, manual
    sync_status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    items_processed INTEGER DEFAULT 0,
    items_successful INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    sync_log TEXT, -- JSON log of sync process
    error_message TEXT,
    next_sync_at DATETIME,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_third_party_apps_category ON third_party_apps(app_category);
CREATE INDEX IF NOT EXISTS idx_third_party_apps_status ON third_party_apps(status);

CREATE INDEX IF NOT EXISTS idx_user_app_connections_user ON user_app_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_connections_app ON user_app_connections(app_id);
CREATE INDEX IF NOT EXISTS idx_user_app_connections_active ON user_app_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_user_app_connections_expires ON user_app_connections(token_expires_at);

CREATE INDEX IF NOT EXISTS idx_integration_workflows_user ON integration_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_active ON integration_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_trigger ON integration_workflows(trigger_type);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow ON workflow_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_connection ON workflow_actions(connection_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_order ON workflow_actions(execution_order);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started ON workflow_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_action_executions_execution ON action_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_action ON action_executions(action_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(execution_status);

CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_user ON app_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_app ON app_usage_analytics(app_id);
CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_date ON app_usage_analytics(date_period);

CREATE INDEX IF NOT EXISTS idx_integration_templates_app ON integration_templates(app_id);
CREATE INDEX IF NOT EXISTS idx_integration_templates_category ON integration_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_integration_templates_public ON integration_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_app_rate_limits_connection ON app_rate_limits(connection_id);
CREATE INDEX IF NOT EXISTS idx_app_rate_limits_window ON app_rate_limits(time_window_start);

CREATE INDEX IF NOT EXISTS idx_app_sync_status_connection ON app_sync_status(connection_id);
CREATE INDEX IF NOT EXISTS idx_app_sync_status_status ON app_sync_status(sync_status);
CREATE INDEX IF NOT EXISTS idx_app_sync_status_next_sync ON app_sync_status(next_sync_at);

-- Insert default third-party applications
INSERT OR IGNORE INTO third_party_apps (app_id, app_name, app_category, app_description, oauth_provider, oauth_authorize_url, oauth_token_url, oauth_scopes, api_base_url, webhook_support, webhook_events, documentation_url) VALUES
-- Communication Apps
('slack', 'Slack', 'communication', 'Team communication and collaboration platform', 'oauth2', 'https://slack.com/oauth/v2/authorize', 'https://slack.com/api/oauth.v2.access', '["chat:write", "channels:read", "users:read", "files:write", "incoming-webhook"]', 'https://slack.com/api', 1, '["message.channels", "app_mention", "file_shared"]', 'https://api.slack.com/'),

('discord', 'Discord', 'communication', 'Voice, video and text communication service', 'oauth2', 'https://discord.com/api/oauth2/authorize', 'https://discord.com/api/oauth2/token', '["bot", "webhook.incoming", "messages.read", "guilds.join"]', 'https://discord.com/api/v10', 1, '["MESSAGE_CREATE", "GUILD_MEMBER_ADD"]', 'https://discord.com/developers/docs/'),

('microsoft_teams', 'Microsoft Teams', 'communication', 'Microsoft Teams collaboration platform', 'oauth2', 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token', '["https://graph.microsoft.com/Chat.ReadWrite", "https://graph.microsoft.com/Team.ReadBasic.All"]', 'https://graph.microsoft.com/v1.0', 1, '["chatMessage", "teamMemberAdded"]', 'https://docs.microsoft.com/en-us/graph/'),

-- Video Conferencing Apps
('zoom', 'Zoom', 'video', 'Video conferencing and webinar platform', 'oauth2', 'https://zoom.us/oauth/authorize', 'https://zoom.us/oauth/token', '["meeting:write", "meeting:read", "webinar:write", "recording:read"]', 'https://api.zoom.us/v2', 1, '["meeting.started", "meeting.ended", "recording.completed"]', 'https://marketplace.zoom.us/docs/api-reference/'),

('google_meet', 'Google Meet', 'video', 'Google Meet video conferencing', 'oauth2', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', '["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/meetings.space.created"]', 'https://www.googleapis.com/calendar/v3', 0, '[]', 'https://developers.google.com/meet/'),

-- Productivity Apps
('notion', 'Notion', 'productivity', 'All-in-one workspace for notes, docs, and collaboration', 'oauth2', 'https://api.notion.com/v1/oauth/authorize', 'https://api.notion.com/v1/oauth/token', '["read", "update", "insert"]', 'https://api.notion.com/v1', 0, '[]', 'https://developers.notion.com/'),

('trello', 'Trello', 'productivity', 'Project management and organization tool', 'oauth1', 'https://trello.com/1/OAuthAuthorizeToken', 'https://trello.com/1/OAuthGetAccessToken', '["read", "write", "account"]', 'https://api.trello.com/1', 1, '["createCard", "updateCard", "commentCard"]', 'https://developer.atlassian.com/cloud/trello/'),

('asana', 'Asana', 'productivity', 'Team project and task management', 'oauth2', 'https://app.asana.com/-/oauth_authorize', 'https://app.asana.com/-/oauth_token', '["default"]', 'https://app.asana.com/api/1.0', 1, '["task", "project", "story"]', 'https://developers.asana.com/docs/'),

-- Storage Apps
('google_drive', 'Google Drive', 'storage', 'Cloud storage and file sharing', 'oauth2', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', '["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"]', 'https://www.googleapis.com/drive/v3', 1, '["file.created", "file.updated", "file.shared"]', 'https://developers.google.com/drive/api/'),

('dropbox', 'Dropbox', 'storage', 'Cloud storage and file synchronization', 'oauth2', 'https://www.dropbox.com/oauth2/authorize', 'https://api.dropboxapi.com/oauth2/token', '["files.content.write", "files.content.read", "sharing.write"]', 'https://api.dropboxapi.com/2', 1, '["file_requests", "paper_doc"]', 'https://www.dropbox.com/developers/documentation/'),

-- Analytics Apps
('google_analytics', 'Google Analytics', 'analytics', 'Web analytics and reporting', 'oauth2', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', '["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/analytics"]', 'https://analyticsreporting.googleapis.com/v4', 0, '[]', 'https://developers.google.com/analytics/'),

-- CRM Apps
('hubspot', 'HubSpot', 'crm', 'Customer relationship management platform', 'oauth2', 'https://app.hubspot.com/oauth/authorize', 'https://api.hubapi.com/oauth/v1/token', '["contacts", "content", "reports", "social", "automation"]', 'https://api.hubapi.com', 1, '["contact.creation", "deal.creation", "company.creation"]', 'https://developers.hubspot.com/docs/api/'),

('salesforce', 'Salesforce', 'crm', 'Customer relationship management and sales automation', 'oauth2', 'https://login.salesforce.com/services/oauth2/authorize', 'https://login.salesforce.com/services/oauth2/token', '["api", "refresh_token", "offline_access"]', 'https://your-instance.salesforce.com/services/data/v54.0', 1, '["AccountChangeEvent", "ContactChangeEvent", "OpportunityChangeEvent"]', 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/');

-- Insert default integration templates
INSERT OR IGNORE INTO integration_templates (template_id, template_name, template_description, template_category, app_id, template_config, required_scopes, is_public, usage_count) VALUES
('slack_interview_notifications', 'Slack Interview Notifications', 'Send interview notifications to Slack channels', 'communication', 'slack', '{"trigger": "interview.created", "action": "send_message", "channel": "#interviews", "message_template": "New interview scheduled: {{title}} with {{guest_name}} on {{date}}"}', '["chat:write", "channels:read"]', 1, 45),

('discord_stream_alerts', 'Discord Stream Alerts', 'Notify Discord when live streams start', 'communication', 'discord', '{"trigger": "stream.started", "action": "send_webhook", "channel": "#streams", "message_template": "🔴 Live stream started: {{title}} - {{platform}}"}', '["webhook.incoming"]', 1, 23),

('zoom_auto_meetings', 'Zoom Auto Meeting Creation', 'Automatically create Zoom meetings for interviews', 'video', 'zoom', '{"trigger": "interview.scheduled", "action": "create_meeting", "settings": {"duration": 60, "waiting_room": true, "recording": "cloud"}}', '["meeting:write"]', 1, 67),

('notion_interview_docs', 'Notion Interview Documentation', 'Create Notion pages for interview summaries', 'productivity', 'notion', '{"trigger": "interview.completed", "action": "create_page", "database_id": "{{database_id}}", "template": "interview_summary"}', '["read", "update", "insert"]', 1, 34),

('google_drive_recordings', 'Google Drive Recording Backup', 'Backup interview recordings to Google Drive', 'storage', 'google_drive', '{"trigger": "recording.completed", "action": "upload_file", "folder_id": "{{folder_id}}", "sharing": "private"}', '["https://www.googleapis.com/auth/drive.file"]', 1, 89);
