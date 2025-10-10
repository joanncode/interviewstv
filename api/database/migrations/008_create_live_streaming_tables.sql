-- Live Streaming Database Schema
-- Migration: 008_create_live_streaming_tables.sql
-- Created: 2025-01-10
-- Description: Create comprehensive live streaming infrastructure tables

-- =====================================================
-- 1. LIVE STREAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS live_streams (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stream_key VARCHAR(64) UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'interview',
    
    -- Stream Configuration
    quality ENUM('360p', '480p', '720p', '1080p') DEFAULT '720p',
    max_viewers INT DEFAULT 1000,
    recording_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    moderation_enabled BOOLEAN DEFAULT TRUE,
    
    -- Stream Status
    status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    scheduled_start DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    
    -- Metadata
    thumbnail_url VARCHAR(500),
    tags JSON,
    is_featured BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_stream_key (stream_key),
    INDEX idx_scheduled_start (scheduled_start)
);

-- =====================================================
-- 2. STREAM SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_sessions (
    id VARCHAR(36) PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    
    -- Session Details
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    status ENUM('active', 'completed', 'failed') DEFAULT 'active',
    
    -- Technical Details
    server_node VARCHAR(100),
    rtmp_url VARCHAR(500),
    hls_url VARCHAR(500),
    
    -- Quality Metrics
    avg_bitrate INT,
    avg_fps DECIMAL(5,2),
    resolution VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

-- =====================================================
-- 3. STREAM VIEWERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_viewers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    user_id INT NULL, -- NULL for anonymous viewers
    session_id VARCHAR(100) NOT NULL,
    
    -- Viewer Details
    ip_address VARCHAR(45),
    user_agent TEXT,
    country_code VARCHAR(2),
    city VARCHAR(100),
    
    -- Viewing Session
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    duration_seconds INT DEFAULT 0,
    
    -- Engagement
    chat_messages_sent INT DEFAULT 0,
    reactions_sent INT DEFAULT 0,
    
    -- Technical Details
    connection_type VARCHAR(50),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_joined_at (joined_at),
    INDEX idx_session_id (session_id)
);

-- =====================================================
-- 4. STREAM CHAT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_chat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    user_id INT NULL, -- NULL for anonymous users
    
    -- Message Details
    message TEXT NOT NULL,
    message_type ENUM('text', 'emoji', 'system', 'moderator') DEFAULT 'text',
    
    -- User Info (for anonymous users)
    anonymous_name VARCHAR(50),
    
    -- Moderation
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by INT NULL,
    deleted_at TIMESTAMP NULL,
    delete_reason VARCHAR(255),
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type),
    INDEX idx_is_deleted (is_deleted)
);

-- =====================================================
-- 5. STREAM RECORDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_recordings (
    id VARCHAR(36) PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    
    -- Recording Details
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration_seconds INT,
    
    -- Video Details
    resolution VARCHAR(20),
    fps DECIMAL(5,2),
    bitrate INT,
    codec VARCHAR(50),
    
    -- Processing Status
    status ENUM('processing', 'completed', 'failed', 'deleted') DEFAULT 'processing',
    processing_started_at TIMESTAMP NULL,
    processing_completed_at TIMESTAMP NULL,
    
    -- Storage Details
    storage_provider VARCHAR(50) DEFAULT 'local',
    storage_url VARCHAR(500),
    cdn_url VARCHAR(500),
    
    -- Metadata
    thumbnail_url VARCHAR(500),
    preview_images JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_filename (filename)
);

-- =====================================================
-- 6. STREAM ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    
    -- Viewer Metrics
    total_viewers INT DEFAULT 0,
    peak_viewers INT DEFAULT 0,
    unique_viewers INT DEFAULT 0,
    avg_watch_time DECIMAL(10,2) DEFAULT 0,
    
    -- Engagement Metrics
    chat_messages INT DEFAULT 0,
    reactions INT DEFAULT 0,
    shares INT DEFAULT 0,
    
    -- Technical Metrics
    avg_bitrate INT DEFAULT 0,
    avg_fps DECIMAL(5,2) DEFAULT 0,
    connection_issues INT DEFAULT 0,
    
    -- Geographic Data
    top_countries JSON,
    top_cities JSON,
    
    -- Device Data
    device_breakdown JSON,
    browser_breakdown JSON,
    
    -- Time-based Data
    hourly_viewers JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 7. STREAM MODERATORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_moderators (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    
    -- Moderator Permissions
    can_delete_messages BOOLEAN DEFAULT TRUE,
    can_timeout_users BOOLEAN DEFAULT TRUE,
    can_ban_users BOOLEAN DEFAULT FALSE,
    can_manage_stream BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    assigned_by INT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE KEY unique_stream_moderator (stream_id, user_id),
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- 8. STREAM REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    user_id INT NULL,
    
    -- Reaction Details
    reaction_type VARCHAR(50) NOT NULL, -- 'like', 'love', 'wow', 'laugh', etc.
    emoji VARCHAR(10),
    
    -- Metadata
    ip_address VARCHAR(45),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_stream_id (stream_id),
    INDEX idx_user_id (user_id),
    INDEX idx_reaction_type (reaction_type),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample live streams (only if users table has data)
INSERT IGNORE INTO live_streams (
    id, user_id, title, description, stream_key, category, quality, status
) VALUES 
(
    'stream-001', 1, 'Tech Entrepreneur Interview Live', 
    'Live interview with a successful tech entrepreneur discussing startup journey and lessons learned.',
    'live_key_001', 'business', '720p', 'scheduled'
),
(
    'stream-002', 2, 'Artist Creative Process Stream', 
    'Watch an artist create their latest masterpiece live with real-time commentary.',
    'live_key_002', 'arts', '1080p', 'scheduled'
);

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_streams_user_status ON live_streams(user_id, status);
CREATE INDEX idx_viewers_stream_joined ON stream_viewers(stream_id, joined_at);
CREATE INDEX idx_chat_stream_created ON stream_chat(stream_id, created_at);
CREATE INDEX idx_recordings_stream_status ON stream_recordings(stream_id, status);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update stream viewer count when viewers join/leave
DELIMITER //
CREATE TRIGGER update_stream_viewer_count 
AFTER INSERT ON stream_viewers
FOR EACH ROW
BEGIN
    UPDATE live_streams 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.stream_id;
END//
DELIMITER ;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active streams with viewer counts
CREATE OR REPLACE VIEW active_streams_view AS
SELECT 
    ls.id,
    ls.title,
    ls.user_id,
    u.name as streamer_name,
    ls.category,
    ls.quality,
    ls.started_at,
    COUNT(sv.id) as current_viewers,
    ls.thumbnail_url
FROM live_streams ls
LEFT JOIN users u ON ls.user_id = u.id
LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id AND sv.left_at IS NULL
WHERE ls.status = 'live'
GROUP BY ls.id, ls.title, ls.user_id, u.name, ls.category, ls.quality, ls.started_at, ls.thumbnail_url;

-- Stream statistics summary
CREATE OR REPLACE VIEW stream_stats_view AS
SELECT 
    ls.id,
    ls.title,
    ls.user_id,
    COUNT(DISTINCT sv.user_id) as unique_viewers,
    COUNT(sv.id) as total_views,
    MAX(sa.peak_viewers) as peak_viewers,
    COUNT(sc.id) as chat_messages,
    AVG(sv.duration_seconds) as avg_watch_time
FROM live_streams ls
LEFT JOIN stream_viewers sv ON ls.id = sv.stream_id
LEFT JOIN stream_analytics sa ON ls.id = sa.stream_id
LEFT JOIN stream_chat sc ON ls.id = sc.stream_id AND sc.is_deleted = FALSE
GROUP BY ls.id, ls.title, ls.user_id;
