-- Live Streaming Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for live streaming functionality

-- Live Streams Table
CREATE TABLE IF NOT EXISTS live_streams (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    category VARCHAR(50) DEFAULT 'interview',
    quality VARCHAR(10) DEFAULT '720p',
    max_viewers INT DEFAULT 1000,
    recording_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    moderation_enabled BOOLEAN DEFAULT TRUE,
    scheduled_start DATETIME,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    duration INT NULL COMMENT 'Duration in seconds',
    thumbnail_url VARCHAR(500),
    recording_url VARCHAR(500),
    rtmp_url VARCHAR(500),
    hls_url VARCHAR(500),
    dash_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_scheduled_start (scheduled_start),
    INDEX idx_started_at (started_at),
    INDEX idx_created_at (created_at)
);

-- Stream Viewers Table
CREATE TABLE IF NOT EXISTS stream_viewers (
    id VARCHAR(50) PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    user_id INT NULL COMMENT 'NULL for anonymous viewers',
    ip_address VARCHAR(45),
    user_agent TEXT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    duration INT NULL COMMENT 'Watch duration in seconds',
    quality VARCHAR(10) DEFAULT '720p',
    device_type VARCHAR(20) DEFAULT 'desktop',
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_joined_at (joined_at),
    INDEX idx_duration (duration)
);

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(50) PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    description TEXT,
    max_messages INT DEFAULT 1000,
    slow_mode_seconds INT DEFAULT 0,
    subscribers_only BOOLEAN DEFAULT FALSE,
    emotes_enabled BOOLEAN DEFAULT TRUE,
    links_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    INDEX idx_stream_id (stream_id)
);

-- Stream Chat Messages Table
CREATE TABLE IF NOT EXISTS stream_chat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    chat_room_id VARCHAR(50) NOT NULL,
    user_id INT NULL,
    username VARCHAR(50),
    message TEXT NOT NULL,
    message_type ENUM('text', 'emote', 'system', 'donation') DEFAULT 'text',
    is_moderator BOOLEAN DEFAULT FALSE,
    is_subscriber BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by INT NULL,
    deleted_reason VARCHAR(255),
    ip_address VARCHAR(45),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stream_id (stream_id),
    INDEX idx_chat_room_id (chat_room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_message_type (message_type)
);

-- Stream Analytics Table
CREATE TABLE IF NOT EXISTS stream_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    INDEX idx_stream_id (stream_id),
    INDEX idx_metric_name (metric_name),
    INDEX idx_recorded_at (recorded_at),
    UNIQUE KEY unique_stream_metric_time (stream_id, metric_name, recorded_at)
);

-- Stream Recordings Table
CREATE TABLE IF NOT EXISTS stream_recordings (
    id VARCHAR(50) PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT 0,
    duration INT DEFAULT 0 COMMENT 'Duration in seconds',
    format VARCHAR(20) DEFAULT 'mp4',
    quality VARCHAR(10) DEFAULT '720p',
    thumbnail_url VARCHAR(500),
    download_url VARCHAR(500),
    status ENUM('processing', 'completed', 'failed', 'deleted') DEFAULT 'processing',
    processing_progress INT DEFAULT 0 COMMENT 'Progress percentage',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    INDEX idx_stream_id (stream_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Stream Moderators Table
CREATE TABLE IF NOT EXISTS stream_moderators (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    permissions JSON COMMENT 'Moderator permissions',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stream_moderator (stream_id, user_id),
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id)
);

-- Stream Bans Table
CREATE TABLE IF NOT EXISTS stream_bans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    user_id INT NULL,
    ip_address VARCHAR(45) NULL,
    banned_by INT NOT NULL,
    reason VARCHAR(255),
    ban_type ENUM('chat', 'view', 'permanent') DEFAULT 'chat',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_expires_at (expires_at)
);

-- Stream Donations Table
CREATE TABLE IF NOT EXISTS stream_donations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    donor_user_id INT NULL,
    donor_name VARCHAR(100),
    donor_email VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50),
    payment_id VARCHAR(100),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stream_id (stream_id),
    INDEX idx_donor_user_id (donor_user_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
);

-- Stream Subscriptions Table (for stream notifications)
CREATE TABLE IF NOT EXISTS stream_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    streamer_id INT NOT NULL,
    notification_types JSON COMMENT 'Types of notifications to receive',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_streamer (user_id, streamer_id),
    INDEX idx_user_id (user_id),
    INDEX idx_streamer_id (streamer_id),
    INDEX idx_is_active (is_active)
);

-- Stream Quality Settings Table
CREATE TABLE IF NOT EXISTS stream_quality_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(50) NOT NULL,
    quality_level VARCHAR(10) NOT NULL,
    bitrate INT NOT NULL COMMENT 'Bitrate in kbps',
    resolution VARCHAR(20) NOT NULL,
    fps INT DEFAULT 30,
    codec VARCHAR(20) DEFAULT 'h264',
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stream_quality (stream_id, quality_level),
    INDEX idx_stream_id (stream_id),
    INDEX idx_quality_level (quality_level)
);

-- Create Views for Analytics

-- Stream Statistics View
CREATE OR REPLACE VIEW stream_statistics AS
SELECT 
    ls.id as stream_id,
    ls.title,
    ls.user_id as streamer_id,
    u.name as streamer_name,
    ls.status,
    ls.started_at,
    ls.ended_at,
    ls.duration,
    COUNT(DISTINCT sv.id) as total_viewers,
    COUNT(DISTINCT CASE WHEN sv.left_at IS NULL THEN sv.id END) as current_viewers,
    AVG(sv.duration) as avg_watch_time,
    MAX(sv.duration) as max_watch_time,
    COUNT(DISTINCT sc.id) as total_messages,
    COUNT(DISTINCT sc.user_id) as unique_chatters,
    COALESCE(SUM(sd.amount), 0) as total_donations,
    COUNT(sd.id) as donation_count
FROM live_streams ls
LEFT JOIN users u ON ls.user_id = u.id
LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id
LEFT JOIN stream_chat sc ON ls.id = sc.stream_id AND sc.is_deleted = FALSE
LEFT JOIN stream_donations sd ON ls.id = sd.stream_id AND sd.payment_status = 'completed'
GROUP BY ls.id;

-- Popular Streams View
CREATE OR REPLACE VIEW popular_streams AS
SELECT 
    ls.*,
    u.name as streamer_name,
    u.avatar as streamer_avatar,
    COUNT(DISTINCT sv.id) as viewer_count,
    COUNT(DISTINCT sc.id) as message_count,
    COALESCE(AVG(sv.duration), 0) as avg_watch_time
FROM live_streams ls
JOIN users u ON ls.user_id = u.id
LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id AND sv.left_at IS NULL
LEFT JOIN stream_chat sc ON ls.id = sc.stream_id AND sc.sent_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
WHERE ls.status = 'live'
GROUP BY ls.id
ORDER BY viewer_count DESC, message_count DESC;

-- User Streaming Stats View
CREATE OR REPLACE VIEW user_streaming_stats AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(DISTINCT ls.id) as total_streams,
    COUNT(DISTINCT CASE WHEN ls.status = 'live' THEN ls.id END) as active_streams,
    SUM(ls.duration) as total_streaming_time,
    AVG(ls.duration) as avg_stream_duration,
    COUNT(DISTINCT sv.id) as total_viewers,
    AVG(viewer_counts.viewer_count) as avg_viewers_per_stream,
    COALESCE(SUM(sd.amount), 0) as total_earnings
FROM users u
LEFT JOIN live_streams ls ON u.id = ls.user_id
LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id
LEFT JOIN stream_donations sd ON ls.id = sd.stream_id AND sd.payment_status = 'completed'
LEFT JOIN (
    SELECT stream_id, COUNT(DISTINCT id) as viewer_count
    FROM stream_viewers
    GROUP BY stream_id
) viewer_counts ON ls.id = viewer_counts.stream_id
WHERE u.streaming_enabled = TRUE
GROUP BY u.id;

-- Add streaming permissions to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS streaming_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS streaming_quality_limit VARCHAR(10) DEFAULT '720p',
ADD COLUMN IF NOT EXISTS max_stream_duration INT DEFAULT 14400 COMMENT 'Max duration in seconds',
ADD COLUMN IF NOT EXISTS max_concurrent_viewers INT DEFAULT 1000;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_streaming_enabled ON users(streaming_enabled);

-- Insert default streaming quality settings
INSERT IGNORE INTO stream_quality_settings (stream_id, quality_level, bitrate, resolution, fps, codec) VALUES
('default', '360p', 1000, '640x360', 30, 'h264'),
('default', '720p', 2500, '1280x720', 30, 'h264'),
('default', '1080p', 5000, '1920x1080', 30, 'h264');

-- Create triggers for automatic analytics collection

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_stream_viewer_insert
AFTER INSERT ON stream_viewers
FOR EACH ROW
BEGIN
    INSERT INTO stream_analytics (stream_id, metric_name, metric_value, metric_unit)
    VALUES (NEW.stream_id, 'viewer_joined', 1, 'count');
END//

CREATE TRIGGER IF NOT EXISTS after_stream_viewer_update
AFTER UPDATE ON stream_viewers
FOR EACH ROW
BEGIN
    IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
        INSERT INTO stream_analytics (stream_id, metric_name, metric_value, metric_unit)
        VALUES (NEW.stream_id, 'viewer_left', 1, 'count');
        
        INSERT INTO stream_analytics (stream_id, metric_name, metric_value, metric_unit)
        VALUES (NEW.stream_id, 'watch_time', NEW.duration, 'seconds');
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS after_stream_chat_insert
AFTER INSERT ON stream_chat
FOR EACH ROW
BEGIN
    INSERT INTO stream_analytics (stream_id, metric_name, metric_value, metric_unit)
    VALUES (NEW.stream_id, 'chat_message', 1, 'count');
END//

CREATE TRIGGER IF NOT EXISTS after_stream_donation_insert
AFTER INSERT ON stream_donations
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'completed' THEN
        INSERT INTO stream_analytics (stream_id, metric_name, metric_value, metric_unit)
        VALUES (NEW.stream_id, 'donation_amount', NEW.amount, NEW.currency);
    END IF;
END//

DELIMITER ;

-- Create stored procedures for common operations

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetStreamAnalytics(IN p_stream_id VARCHAR(50))
BEGIN
    SELECT 
        metric_name,
        SUM(metric_value) as total_value,
        AVG(metric_value) as avg_value,
        COUNT(*) as count,
        metric_unit
    FROM stream_analytics 
    WHERE stream_id = p_stream_id 
    GROUP BY metric_name, metric_unit
    ORDER BY metric_name;
END//

CREATE PROCEDURE IF NOT EXISTS GetTopStreamers(IN p_limit INT DEFAULT 10)
BEGIN
    SELECT 
        u.id,
        u.name,
        u.avatar,
        COUNT(DISTINCT ls.id) as total_streams,
        SUM(CASE WHEN ls.status = 'live' THEN 1 ELSE 0 END) as active_streams,
        AVG(viewer_stats.avg_viewers) as avg_viewers,
        SUM(ls.duration) as total_streaming_time
    FROM users u
    JOIN live_streams ls ON u.id = ls.user_id
    LEFT JOIN (
        SELECT 
            stream_id, 
            AVG(CASE WHEN left_at IS NULL THEN 1 ELSE 0 END) as avg_viewers
        FROM stream_viewers 
        GROUP BY stream_id
    ) viewer_stats ON ls.id = viewer_stats.stream_id
    WHERE u.streaming_enabled = TRUE
    GROUP BY u.id
    ORDER BY avg_viewers DESC, total_streaming_time DESC
    LIMIT p_limit;
END//

DELIMITER ;
