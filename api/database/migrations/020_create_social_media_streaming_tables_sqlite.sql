-- Social Media Streaming Integration Tables
-- Migration: 020_create_social_media_streaming_tables_sqlite.sql

-- Social media platforms configuration
CREATE TABLE IF NOT EXISTS social_media_platforms (
    platform_id TEXT PRIMARY KEY,
    platform_name TEXT NOT NULL,
    platform_type TEXT NOT NULL, -- youtube, facebook, twitch, linkedin, twitter
    api_endpoint TEXT,
    auth_endpoint TEXT,
    token_endpoint TEXT,
    streaming_endpoint TEXT,
    scopes TEXT, -- JSON array of required scopes
    client_id TEXT,
    client_secret TEXT, -- encrypted
    is_active BOOLEAN DEFAULT 1,
    supports_live_streaming BOOLEAN DEFAULT 1,
    supports_chat BOOLEAN DEFAULT 1,
    supports_analytics BOOLEAN DEFAULT 1,
    max_stream_duration INTEGER DEFAULT 14400, -- seconds (4 hours)
    max_bitrate INTEGER DEFAULT 5000, -- kbps
    supported_resolutions TEXT, -- JSON array
    rate_limit_per_hour INTEGER DEFAULT 100,
    configuration TEXT, -- JSON platform-specific configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User social media connections
CREATE TABLE IF NOT EXISTS user_social_media_connections (
    connection_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform_id TEXT NOT NULL,
    external_user_id TEXT, -- user ID from the platform
    username TEXT,
    display_name TEXT,
    profile_url TEXT,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at DATETIME,
    channel_id TEXT, -- YouTube channel ID, Facebook page ID, etc.
    channel_name TEXT,
    channel_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    streaming_enabled BOOLEAN DEFAULT 1,
    auto_publish BOOLEAN DEFAULT 0,
    default_privacy TEXT DEFAULT 'public', -- public, unlisted, private
    permissions TEXT, -- JSON array of granted permissions
    settings TEXT, -- JSON user-specific settings
    last_stream_at DATETIME,
    total_streams INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    subscriber_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Social media stream configurations
CREATE TABLE IF NOT EXISTS social_media_streams (
    stream_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    local_stream_id TEXT, -- link to live_streams table
    external_stream_id TEXT, -- stream ID from the platform
    platform_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT, -- JSON array of tags
    thumbnail_url TEXT,
    privacy_status TEXT DEFAULT 'public', -- public, unlisted, private
    scheduled_start_time DATETIME,
    actual_start_time DATETIME,
    actual_end_time DATETIME,
    stream_url TEXT, -- RTMP URL for the platform
    stream_key TEXT, -- encrypted stream key
    watch_url TEXT, -- public URL to watch the stream
    embed_url TEXT, -- embeddable URL
    status TEXT DEFAULT 'scheduled', -- scheduled, live, ended, error
    viewer_count INTEGER DEFAULT 0,
    peak_viewer_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    chat_enabled BOOLEAN DEFAULT 1,
    recording_enabled BOOLEAN DEFAULT 1,
    monetization_enabled BOOLEAN DEFAULT 0,
    age_restricted BOOLEAN DEFAULT 0,
    language TEXT DEFAULT 'en',
    quality TEXT DEFAULT '720p',
    bitrate INTEGER DEFAULT 2500,
    framerate INTEGER DEFAULT 30,
    error_message TEXT,
    platform_metadata TEXT, -- JSON platform-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES user_social_media_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Multi-platform streaming sessions
CREATE TABLE IF NOT EXISTS multi_platform_streams (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    local_stream_id TEXT NOT NULL, -- primary stream from live_streams
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT, -- JSON array
    thumbnail_url TEXT,
    scheduled_start_time DATETIME,
    actual_start_time DATETIME,
    actual_end_time DATETIME,
    status TEXT DEFAULT 'scheduled', -- scheduled, live, ended, error
    total_platforms INTEGER DEFAULT 0,
    active_platforms INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    chat_enabled BOOLEAN DEFAULT 1,
    recording_enabled BOOLEAN DEFAULT 1,
    auto_start BOOLEAN DEFAULT 0,
    sync_settings TEXT, -- JSON synchronization settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Platform stream mappings for multi-streaming
CREATE TABLE IF NOT EXISTS platform_stream_mappings (
    mapping_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    stream_id TEXT NOT NULL, -- social_media_streams.stream_id
    platform_id TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    sync_enabled BOOLEAN DEFAULT 1,
    delay_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, active, failed, ended
    start_time DATETIME,
    end_time DATETIME,
    viewer_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES multi_platform_streams(session_id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_social_media_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES social_media_streams(stream_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Social media chat messages
CREATE TABLE IF NOT EXISTS social_media_chat_messages (
    message_id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    external_message_id TEXT,
    user_id TEXT, -- platform user ID
    username TEXT,
    display_name TEXT,
    user_avatar_url TEXT,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat', -- chat, super_chat, donation, subscription
    amount DECIMAL(10,2), -- for donations/super chat
    currency TEXT, -- for donations/super chat
    is_moderator BOOLEAN DEFAULT 0,
    is_verified BOOLEAN DEFAULT 0,
    is_subscriber BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    moderation_status TEXT DEFAULT 'approved', -- approved, pending, rejected, deleted
    moderation_reason TEXT,
    platform_metadata TEXT, -- JSON platform-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES social_media_streams(stream_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Stream analytics and metrics
CREATE TABLE IF NOT EXISTS social_media_stream_analytics (
    analytics_id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    date_period DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    peak_concurrent_viewers INTEGER DEFAULT 0,
    average_view_duration REAL DEFAULT 0, -- seconds
    total_watch_time REAL DEFAULT 0, -- seconds
    chat_messages_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    subscribers_gained INTEGER DEFAULT 0,
    revenue_amount DECIMAL(10,2) DEFAULT 0,
    revenue_currency TEXT DEFAULT 'USD',
    engagement_rate REAL DEFAULT 0, -- percentage
    retention_rate REAL DEFAULT 0, -- percentage
    click_through_rate REAL DEFAULT 0, -- percentage
    audience_demographics TEXT, -- JSON demographic data
    traffic_sources TEXT, -- JSON traffic source data
    device_breakdown TEXT, -- JSON device usage data
    geographic_data TEXT, -- JSON geographic data
    performance_metrics TEXT, -- JSON performance data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES social_media_streams(stream_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Stream moderation and content management
CREATE TABLE IF NOT EXISTS social_media_stream_moderation (
    moderation_id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    moderation_type TEXT NOT NULL, -- chat_filter, content_warning, age_restriction, copyright_claim
    action_taken TEXT NOT NULL, -- warning, timeout, ban, content_removal, stream_termination
    reason TEXT,
    moderator_id TEXT, -- platform moderator ID
    moderator_name TEXT,
    target_user_id TEXT, -- affected user ID
    target_username TEXT,
    content_reference TEXT, -- message ID, timestamp, etc.
    severity TEXT DEFAULT 'low', -- low, medium, high, critical
    is_automated BOOLEAN DEFAULT 0,
    is_appealed BOOLEAN DEFAULT 0,
    appeal_status TEXT, -- pending, approved, rejected
    resolution TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    platform_metadata TEXT, -- JSON platform-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES social_media_streams(stream_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id)
);

-- Social media integration settings
CREATE TABLE IF NOT EXISTS social_media_integration_settings (
    setting_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform_id TEXT,
    setting_category TEXT NOT NULL, -- streaming, chat, analytics, moderation, monetization
    setting_key TEXT NOT NULL,
    setting_value TEXT, -- JSON value
    is_encrypted BOOLEAN DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES social_media_platforms(platform_id),
    UNIQUE(user_id, platform_id, setting_category, setting_key)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_social_media_connections_user ON user_social_media_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_media_connections_platform ON user_social_media_connections(platform_id);
CREATE INDEX IF NOT EXISTS idx_user_social_media_connections_active ON user_social_media_connections(is_active, streaming_enabled);

CREATE INDEX IF NOT EXISTS idx_social_media_streams_connection ON social_media_streams(connection_id);
CREATE INDEX IF NOT EXISTS idx_social_media_streams_platform ON social_media_streams(platform_id);
CREATE INDEX IF NOT EXISTS idx_social_media_streams_status ON social_media_streams(status, scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_social_media_streams_local ON social_media_streams(local_stream_id);

CREATE INDEX IF NOT EXISTS idx_multi_platform_streams_user ON multi_platform_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_platform_streams_status ON multi_platform_streams(status, scheduled_start_time);

CREATE INDEX IF NOT EXISTS idx_platform_stream_mappings_session ON platform_stream_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_platform_stream_mappings_connection ON platform_stream_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_platform_stream_mappings_status ON platform_stream_mappings(status);

CREATE INDEX IF NOT EXISTS idx_social_media_chat_messages_stream ON social_media_chat_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_social_media_chat_messages_timestamp ON social_media_chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_social_media_chat_messages_moderation ON social_media_chat_messages(moderation_status);

CREATE INDEX IF NOT EXISTS idx_social_media_stream_analytics_stream ON social_media_stream_analytics(stream_id);
CREATE INDEX IF NOT EXISTS idx_social_media_stream_analytics_platform ON social_media_stream_analytics(platform_id);
CREATE INDEX IF NOT EXISTS idx_social_media_stream_analytics_date ON social_media_stream_analytics(date_period);

CREATE INDEX IF NOT EXISTS idx_social_media_stream_moderation_stream ON social_media_stream_moderation(stream_id);
CREATE INDEX IF NOT EXISTS idx_social_media_stream_moderation_type ON social_media_stream_moderation(moderation_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_social_media_integration_settings_user ON social_media_integration_settings(user_id, platform_id);
CREATE INDEX IF NOT EXISTS idx_social_media_integration_settings_category ON social_media_integration_settings(setting_category);

-- Insert default social media platforms
INSERT OR IGNORE INTO social_media_platforms (platform_id, platform_name, platform_type, api_endpoint, auth_endpoint, token_endpoint, streaming_endpoint, scopes, is_active, supports_live_streaming, supports_chat, supports_analytics, max_stream_duration, max_bitrate, supported_resolutions) VALUES
('youtube', 'YouTube', 'youtube', 'https://www.googleapis.com/youtube/v3', 'https://accounts.google.com/o/oauth2/auth', 'https://oauth2.googleapis.com/token', 'rtmp://a.rtmp.youtube.com/live2', '["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.force-ssl"]', 1, 1, 1, 1, 43200, 8000, '["360p", "480p", "720p", "1080p", "1440p", "2160p"]'),

('facebook', 'Facebook', 'facebook', 'https://graph.facebook.com/v18.0', 'https://www.facebook.com/v18.0/dialog/oauth', 'https://graph.facebook.com/v18.0/oauth/access_token', 'rtmps://live-api-s.facebook.com:443/rtmp', '["pages_show_list", "pages_read_engagement", "pages_manage_posts", "publish_video"]', 1, 1, 1, 1, 14400, 6000, '["360p", "480p", "720p", "1080p"]'),

('twitch', 'Twitch', 'twitch', 'https://api.twitch.tv/helix', 'https://id.twitch.tv/oauth2/authorize', 'https://id.twitch.tv/oauth2/token', 'rtmp://live.twitch.tv/live', '["channel:manage:broadcast", "channel:read:stream_key", "chat:read", "chat:edit"]', 1, 1, 1, 1, 86400, 6000, '["360p", "480p", "720p", "1080p"]'),

('linkedin', 'LinkedIn', 'linkedin', 'https://api.linkedin.com/v2', 'https://www.linkedin.com/oauth/v2/authorization', 'https://www.linkedin.com/oauth/v2/accessToken', null, '["w_member_social", "r_liteprofile", "r_member_social"]', 1, 1, 0, 1, 3600, 3000, '["360p", "480p", "720p", "1080p"]'),

('twitter', 'Twitter/X', 'twitter', 'https://api.twitter.com/2', 'https://twitter.com/i/oauth2/authorize', 'https://api.twitter.com/2/oauth2/token', null, '["tweet.read", "tweet.write", "users.read", "offline.access"]', 1, 1, 0, 1, 7200, 2500, '["360p", "480p", "720p", "1080p"]');

-- Insert sample social media integration settings
INSERT OR IGNORE INTO social_media_integration_settings (setting_id, user_id, platform_id, setting_category, setting_key, setting_value, description) VALUES
('default_youtube_privacy', 1, 'youtube', 'streaming', 'default_privacy', '"public"', 'Default privacy setting for YouTube streams'),
('default_facebook_privacy', 1, 'facebook', 'streaming', 'default_privacy', '"public"', 'Default privacy setting for Facebook streams'),
('auto_start_delay', 1, null, 'streaming', 'auto_start_delay_seconds', '30', 'Delay before auto-starting streams on all platforms'),
('chat_moderation_enabled', 1, null, 'moderation', 'auto_moderation_enabled', 'true', 'Enable automatic chat moderation'),
('monetization_enabled', 1, null, 'monetization', 'enable_monetization', 'false', 'Enable monetization features where available'),
('analytics_tracking', 1, null, 'analytics', 'detailed_analytics_enabled', 'true', 'Enable detailed analytics tracking');
