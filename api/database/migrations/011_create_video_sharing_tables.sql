-- Video Sharing Tables Migration
-- Creates tables for video sharing functionality

-- Video shares table
CREATE TABLE IF NOT EXISTS video_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    recording_id VARCHAR(36) NOT NULL,
    user_id INTEGER NOT NULL,
    privacy_level VARCHAR(20) DEFAULT 'unlisted' CHECK (privacy_level IN ('public', 'unlisted', 'private')),
    expires_at DATETIME NULL,
    password_hash VARCHAR(255) NULL,
    allow_download BOOLEAN DEFAULT 0,
    allow_embedding BOOLEAN DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (recording_id) REFERENCES interview_recordings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Share activity log table
CREATE TABLE IF NOT EXISTS share_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id INTEGER NOT NULL,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('created', 'accessed', 'updated', 'revoked', 'downloaded')),
    user_id INTEGER NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (share_id) REFERENCES video_shares(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Social media shares table (for tracking social media sharing)
CREATE TABLE IF NOT EXISTS social_media_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id INTEGER NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'reddit', 'email', 'copy_link')),
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (share_id) REFERENCES video_shares(id) ON DELETE CASCADE
);

-- Embed tracking table (for tracking where videos are embedded)
CREATE TABLE IF NOT EXISTS embed_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id INTEGER NOT NULL,
    referrer_domain VARCHAR(255) NULL,
    embed_url TEXT NULL,
    view_count INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (share_id) REFERENCES video_shares(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_shares_token ON video_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_video_shares_recording ON video_shares(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_user ON video_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_active ON video_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_video_shares_expires ON video_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_shares_privacy ON video_shares(privacy_level);

CREATE INDEX IF NOT EXISTS idx_share_activity_share ON share_activity_log(share_id);
CREATE INDEX IF NOT EXISTS idx_share_activity_type ON share_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_share_activity_created ON share_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_social_shares_share ON social_media_shares(share_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_platform ON social_media_shares(platform);

CREATE INDEX IF NOT EXISTS idx_embed_tracking_share ON embed_tracking(share_id);
CREATE INDEX IF NOT EXISTS idx_embed_tracking_domain ON embed_tracking(referrer_domain);

-- Triggers for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_video_shares_timestamp 
    AFTER UPDATE ON video_shares
    FOR EACH ROW
    BEGIN
        UPDATE video_shares SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Sample data for testing (optional)
-- INSERT INTO video_shares (share_token, recording_id, user_id, privacy_level, allow_download, allow_embedding)
-- VALUES ('sample_token_123', 'rec_sample123', 1, 'public', 1, 1);

-- Views for analytics
CREATE VIEW IF NOT EXISTS share_analytics_summary AS
SELECT 
    vs.user_id,
    COUNT(*) as total_shares,
    SUM(vs.view_count) as total_views,
    AVG(vs.view_count) as avg_views_per_share,
    COUNT(CASE WHEN vs.privacy_level = 'public' THEN 1 END) as public_shares,
    COUNT(CASE WHEN vs.privacy_level = 'unlisted' THEN 1 END) as unlisted_shares,
    COUNT(CASE WHEN vs.privacy_level = 'private' THEN 1 END) as private_shares,
    COUNT(CASE WHEN vs.password_hash IS NOT NULL THEN 1 END) as password_protected_shares,
    COUNT(CASE WHEN vs.is_active = 1 THEN 1 END) as active_shares,
    COUNT(CASE WHEN vs.expires_at IS NOT NULL AND vs.expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_shares
FROM video_shares vs
GROUP BY vs.user_id;

CREATE VIEW IF NOT EXISTS daily_share_activity AS
SELECT 
    DATE(sal.created_at) as activity_date,
    sal.activity_type,
    COUNT(*) as activity_count
FROM share_activity_log sal
GROUP BY DATE(sal.created_at), sal.activity_type
ORDER BY activity_date DESC, sal.activity_type;

CREATE VIEW IF NOT EXISTS popular_shared_videos AS
SELECT 
    vs.recording_id,
    vf.original_filename,
    vs.view_count,
    vs.privacy_level,
    vs.created_at as shared_at,
    COUNT(sms.id) as social_shares
FROM video_shares vs
LEFT JOIN video_files vf ON vs.recording_id = vf.recording_id
LEFT JOIN social_media_shares sms ON vs.id = sms.share_id
WHERE vs.is_active = 1
GROUP BY vs.id
ORDER BY vs.view_count DESC, social_shares DESC;

-- Cleanup procedure for expired shares (can be run via cron)
-- This would typically be implemented as a stored procedure in MySQL/PostgreSQL
-- For SQLite, this logic would be in the application code

-- Comments for documentation
-- video_shares table: Main table storing share configurations and metadata
-- share_activity_log table: Tracks all activities related to shares for analytics
-- social_media_shares table: Tracks social media sharing events
-- embed_tracking table: Tracks where videos are embedded and their performance
-- 
-- Privacy levels:
-- - public: Visible in public galleries and search engines
-- - unlisted: Accessible via direct link only
-- - private: Requires authentication or password
--
-- Activity types:
-- - created: Share link was created
-- - accessed: Video was viewed via share link
-- - updated: Share settings were modified
-- - revoked: Share link was disabled
-- - downloaded: Video was downloaded via share link
