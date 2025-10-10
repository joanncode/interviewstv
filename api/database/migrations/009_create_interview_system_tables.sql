-- Interview System Database Schema
-- Creates tables for guest management, invitations, and interview rooms

-- Interview Rooms Table
CREATE TABLE IF NOT EXISTS interview_rooms (
    id VARCHAR(36) PRIMARY KEY,
    host_user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start DATETIME,
    scheduled_end DATETIME,
    actual_start DATETIME,
    actual_end DATETIME,
    status ENUM('scheduled', 'waiting', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    room_code VARCHAR(12) UNIQUE NOT NULL,
    max_guests INT DEFAULT 10,
    recording_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    waiting_room_enabled BOOLEAN DEFAULT TRUE,
    guest_approval_required BOOLEAN DEFAULT FALSE,
    password_protected BOOLEAN DEFAULT FALSE,
    room_password VARCHAR(255),
    stream_key VARCHAR(64) UNIQUE,
    rtmp_url VARCHAR(500),
    hls_url VARCHAR(500),
    webrtc_url VARCHAR(500),
    recording_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_host_user_id (host_user_id),
    INDEX idx_room_code (room_code),
    INDEX idx_status (status),
    INDEX idx_scheduled_start (scheduled_start)
);

-- Guest Invitations Table
CREATE TABLE IF NOT EXISTS guest_invitations (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    guest_name VARCHAR(255),
    join_code VARCHAR(12) UNIQUE NOT NULL,
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    role ENUM('guest', 'co-host', 'viewer') DEFAULT 'guest',
    status ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP NULL,
    join_attempts INT DEFAULT 0,
    last_join_attempt TIMESTAMP NULL,
    permissions JSON,
    custom_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_email (email),
    INDEX idx_join_code (join_code),
    INDEX idx_invitation_token (invitation_token),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
);

-- Room Participants Table (Active Sessions)
CREATE TABLE IF NOT EXISTS room_participants (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    invitation_id VARCHAR(36),
    user_id INT,
    guest_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role ENUM('host', 'co-host', 'guest', 'viewer') NOT NULL,
    status ENUM('waiting', 'connected', 'disconnected', 'kicked', 'left') DEFAULT 'waiting',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    connection_id VARCHAR(64),
    peer_id VARCHAR(64),
    audio_enabled BOOLEAN DEFAULT TRUE,
    video_enabled BOOLEAN DEFAULT TRUE,
    screen_sharing BOOLEAN DEFAULT FALSE,
    hand_raised BOOLEAN DEFAULT FALSE,
    muted_by_host BOOLEAN DEFAULT FALSE,
    camera_disabled_by_host BOOLEAN DEFAULT FALSE,
    connection_quality ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (invitation_id) REFERENCES guest_invitations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_id (room_id),
    INDEX idx_invitation_id (invitation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_connection_id (connection_id)
);

-- Interview Recordings Table
CREATE TABLE IF NOT EXISTS interview_recordings (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration INT,
    format VARCHAR(10) DEFAULT 'mp4',
    quality VARCHAR(10) DEFAULT '720p',
    status ENUM('recording', 'processing', 'completed', 'failed', 'deleted') DEFAULT 'recording',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    thumbnail_path VARCHAR(500),
    download_url VARCHAR(500),
    view_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    processing_progress INT DEFAULT 0,
    error_message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

-- Chat Messages Table (Enhanced)
CREATE TABLE IF NOT EXISTS interview_chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    participant_id VARCHAR(36) NOT NULL,
    message_type ENUM('text', 'emoji', 'system', 'file', 'poll') DEFAULT 'text',
    content TEXT NOT NULL,
    reply_to_id VARCHAR(36),
    is_private BOOLEAN DEFAULT FALSE,
    private_to_participant_id VARCHAR(36),
    is_moderated BOOLEAN DEFAULT FALSE,
    moderated_by VARCHAR(36),
    moderated_at TIMESTAMP NULL,
    moderation_reason TEXT,
    reactions JSON,
    attachments JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES room_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES interview_chat_messages(id) ON DELETE SET NULL,
    FOREIGN KEY (private_to_participant_id) REFERENCES room_participants(id) ON DELETE SET NULL,
    INDEX idx_room_id (room_id),
    INDEX idx_participant_id (participant_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_message_type (message_type)
);

-- Room Settings Table
CREATE TABLE IF NOT EXISTS room_settings (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_setting (room_id, setting_key),
    INDEX idx_room_id (room_id),
    INDEX idx_setting_key (setting_key)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_name (template_name),
    INDEX idx_is_active (is_active)
);

-- Insert default email templates
INSERT INTO email_templates (id, template_name, subject, html_content, text_content, variables) VALUES
('tpl_invitation', 'guest_invitation', 'You\'re invited to join an interview on Interviews.tv', 
'<html><body><h2>You\'re Invited!</h2><p>{{host_name}} has invited you to join an interview: <strong>{{room_title}}</strong></p><p>Scheduled for: {{scheduled_time}}</p><p><a href="{{join_url}}" style="background:#FF0000;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Join Interview</a></p><p>Or enter this code: <strong>{{join_code}}</strong></p></body></html>',
'You\'re invited to join an interview: {{room_title}}\nHost: {{host_name}}\nScheduled: {{scheduled_time}}\nJoin URL: {{join_url}}\nJoin Code: {{join_code}}',
'["host_name", "room_title", "scheduled_time", "join_url", "join_code"]'),

('tpl_reminder', 'interview_reminder', 'Interview starting soon - {{room_title}}',
'<html><body><h2>Interview Starting Soon!</h2><p>Your interview <strong>{{room_title}}</strong> starts in {{time_until}}.</p><p><a href="{{join_url}}" style="background:#FF0000;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Join Now</a></p></body></html>',
'Interview starting soon: {{room_title}}\nStarts in: {{time_until}}\nJoin URL: {{join_url}}',
'["room_title", "time_until", "join_url"]');
