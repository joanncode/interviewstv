-- Interview System Tables for SQLite
-- Created for Interviews.tv Live Streaming Platform

-- Interview Rooms Table
CREATE TABLE IF NOT EXISTS interview_rooms (
    id VARCHAR(36) PRIMARY KEY,
    host_user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    room_code VARCHAR(12) UNIQUE NOT NULL,
    scheduled_start DATETIME NOT NULL,
    scheduled_end DATETIME,
    actual_start DATETIME,
    actual_end DATETIME,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'live', 'ended', 'cancelled')),
    max_guests INTEGER DEFAULT 10,
    recording_enabled BOOLEAN DEFAULT 1,
    auto_recording_enabled BOOLEAN DEFAULT 0,
    chat_enabled BOOLEAN DEFAULT 1,
    waiting_room_enabled BOOLEAN DEFAULT 1,
    guest_approval_required BOOLEAN DEFAULT 0,
    stream_key VARCHAR(64),
    rtmp_url VARCHAR(255),
    hls_url VARCHAR(255),
    webrtc_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guest Invitations Table
CREATE TABLE IF NOT EXISTS guest_invitations (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    guest_name VARCHAR(255),
    join_code VARCHAR(12) UNIQUE NOT NULL,
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('guest', 'co-host', 'viewer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    join_attempts INTEGER DEFAULT 0,
    max_join_attempts INTEGER DEFAULT 5,
    custom_message TEXT,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE
);

-- Room Participants Table (Active Sessions)
CREATE TABLE IF NOT EXISTS room_participants (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    invitation_id VARCHAR(36),
    participant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('host', 'co-host', 'guest', 'viewer')),
    connection_id VARCHAR(64),
    peer_id VARCHAR(64),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    audio_enabled BOOLEAN DEFAULT 1,
    video_enabled BOOLEAN DEFAULT 1,
    screen_sharing BOOLEAN DEFAULT 0,
    hand_raised BOOLEAN DEFAULT 0,
    waiting_room BOOLEAN DEFAULT 1,
    can_join BOOLEAN DEFAULT 0,
    device_info TEXT,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (invitation_id) REFERENCES guest_invitations(id) ON DELETE SET NULL
);

-- Interview Recordings Table
CREATE TABLE IF NOT EXISTS interview_recordings (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration INTEGER,
    format VARCHAR(10) DEFAULT 'mp4',
    quality VARCHAR(10) DEFAULT '720p',
    status VARCHAR(20) DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    download_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE
);

-- Interview Chat Messages Table
CREATE TABLE IF NOT EXISTS interview_chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    participant_id VARCHAR(36) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'file')),
    message_content TEXT NOT NULL,
    file_url VARCHAR(500),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES room_participants(id) ON DELETE CASCADE
);

-- Room Settings Table (Key-Value Store)
CREATE TABLE IF NOT EXISTS room_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id VARCHAR(36) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE,
    UNIQUE(room_id, setting_key)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview Templates Table
CREATE TABLE IF NOT EXISTS interview_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    type VARCHAR(50) DEFAULT 'standard' CHECK (type IN ('standard', 'technical', 'behavioral', 'panel', 'screening')),
    duration_minutes INTEGER DEFAULT 60,
    max_guests INTEGER DEFAULT 10,
    questions TEXT, -- JSON array of questions
    structure TEXT, -- JSON object defining interview structure
    settings TEXT, -- JSON object for default room settings
    is_public BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_by INTEGER,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview Template Questions Table
CREATE TABLE IF NOT EXISTS interview_template_questions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'open' CHECK (question_type IN ('open', 'multiple_choice', 'rating', 'yes_no', 'technical')),
    category VARCHAR(100),
    time_limit_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT 1,
    follow_up_questions TEXT, -- JSON array
    scoring_criteria TEXT, -- JSON object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(id) ON DELETE CASCADE
);

-- Interview Template Usage Table
CREATE TABLE IF NOT EXISTS interview_template_usage (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(36) NOT NULL,
    used_by INTEGER NOT NULL,
    customizations TEXT, -- JSON object of any customizations made
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_notes TEXT,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES interview_rooms(id) ON DELETE CASCADE
);

-- Insert default email templates
INSERT OR REPLACE INTO email_templates (id, template_name, subject, html_content, text_content, variables) VALUES
('tpl_invitation', 'guest_invitation', 'You''re invited to join an interview on Interviews.tv', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Interview Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: #FF0000; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 15px 30px; background: #FF0000; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
        .code-box { background: #f8f9fa; border: 2px dashed #ddd; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
        .join-code { font-size: 24px; font-weight: bold; color: #FF0000; letter-spacing: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎥 Interviews.tv</h1>
            <h2>You''re Invited!</h2>
        </div>
        <div class="content">
            <p>Hello {{guest_name}},</p>
            <p><strong>{{host_name}}</strong> has invited you to join an interview:</p>
            <h3>{{room_title}}</h3>
            <p><strong>Scheduled Time:</strong> {{scheduled_time}}</p>
            
            <div class="code-box">
                <p><strong>Your Join Code:</strong></p>
                <div class="join-code">{{join_code}}</div>
                <p><small>Enter this code at interviews.tv/join</small></p>
            </div>
            
            <div style="text-align: center;">
                <a href="{{join_url}}" class="btn">Join Interview</a>
            </div>
            
            <p><strong>What you need to know:</strong></p>
            <ul>
                <li>Make sure you have a working camera and microphone</li>
                <li>Join a few minutes early to test your setup</li>
                <li>Use a stable internet connection</li>
                <li>Find a quiet, well-lit space</li>
            </ul>
            
            <p>If you have any questions, please contact the host directly.</p>
            <p>Looking forward to seeing you!</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Interviews.tv. All rights reserved.</p>
            <p>This invitation will expire in 24 hours.</p>
        </div>
    </div>
</body>
</html>',
'You''re invited to join an interview: {{room_title}}

Host: {{host_name}}
Scheduled Time: {{scheduled_time}}

Join Code: {{join_code}}
Join URL: {{join_url}}

Visit interviews.tv/join and enter your join code to participate.

Make sure you have:
- Working camera and microphone
- Stable internet connection
- Quiet, well-lit space

This invitation expires in 24 hours.

© 2024 Interviews.tv',
'["host_name", "guest_name", "room_title", "scheduled_time", "join_url", "join_code"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_rooms_host ON interview_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_interview_rooms_status ON interview_rooms(status);
CREATE INDEX IF NOT EXISTS idx_interview_rooms_scheduled ON interview_rooms(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_guest_invitations_room ON guest_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_email ON guest_invitations(email);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_code ON guest_invitations(join_code);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_token ON guest_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_status ON guest_invitations(status);

CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_active ON room_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON interview_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_participant ON interview_chat_messages(participant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent ON interview_chat_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_recordings_room ON interview_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON interview_recordings(status);

CREATE INDEX IF NOT EXISTS idx_room_settings_room ON room_settings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_settings_key ON room_settings(setting_key);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Interview Template Indexes
CREATE INDEX IF NOT EXISTS idx_interview_templates_category ON interview_templates(category);
CREATE INDEX IF NOT EXISTS idx_interview_templates_type ON interview_templates(type);
CREATE INDEX IF NOT EXISTS idx_interview_templates_public ON interview_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_interview_templates_featured ON interview_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_interview_template_questions_template ON interview_template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_interview_template_questions_order ON interview_template_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_interview_template_usage_template ON interview_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_interview_template_usage_room ON interview_template_usage(room_id);

-- Insert default interview templates
INSERT OR REPLACE INTO interview_templates (id, name, description, category, type, duration_minutes, max_guests, questions, structure, settings, is_public, is_featured) VALUES
('tpl_general_interview', 'General Interview', 'A comprehensive general interview template suitable for most positions', 'general', 'standard', 60, 5,
'[
    {"text": "Tell me about yourself and your background", "type": "open", "category": "introduction", "time_limit": 5},
    {"text": "What interests you about this role/company?", "type": "open", "category": "motivation", "time_limit": 3},
    {"text": "Describe a challenging situation you faced and how you handled it", "type": "open", "category": "behavioral", "time_limit": 5},
    {"text": "What are your greatest strengths?", "type": "open", "category": "strengths", "time_limit": 3},
    {"text": "What areas would you like to improve or develop?", "type": "open", "category": "development", "time_limit": 3},
    {"text": "Where do you see yourself in 5 years?", "type": "open", "category": "goals", "time_limit": 3},
    {"text": "Do you have any questions for us?", "type": "open", "category": "questions", "time_limit": 10}
]',
'{"phases": [{"name": "Introduction", "duration": 5}, {"name": "Background Discussion", "duration": 15}, {"name": "Behavioral Questions", "duration": 20}, {"name": "Skills Assessment", "duration": 10}, {"name": "Q&A", "duration": 10}]}',
'{"recording_enabled": true, "auto_recording_enabled": true, "chat_enabled": true, "waiting_room_enabled": true, "guest_approval_required": false}',
1, 1),

('tpl_technical_interview', 'Technical Interview', 'Technical interview template for software engineering and technical roles', 'technical', 'technical', 90, 3,
'[
    {"text": "Walk me through your technical background and experience", "type": "open", "category": "background", "time_limit": 5},
    {"text": "Describe a complex technical problem you solved recently", "type": "open", "category": "problem_solving", "time_limit": 10},
    {"text": "Code Review: Please review this code snippet and suggest improvements", "type": "technical", "category": "code_review", "time_limit": 15},
    {"text": "System Design: How would you design a scalable web application?", "type": "technical", "category": "system_design", "time_limit": 20},
    {"text": "What technologies are you most excited about and why?", "type": "open", "category": "technology", "time_limit": 5},
    {"text": "How do you approach debugging and troubleshooting?", "type": "open", "category": "debugging", "time_limit": 5},
    {"text": "Questions about our tech stack and development process?", "type": "open", "category": "questions", "time_limit": 10}
]',
'{"phases": [{"name": "Technical Background", "duration": 10}, {"name": "Problem Solving", "duration": 25}, {"name": "Code Review", "duration": 20}, {"name": "System Design", "duration": 25}, {"name": "Q&A", "duration": 10}]}',
'{"recording_enabled": true, "auto_recording_enabled": true, "chat_enabled": true, "waiting_room_enabled": true, "guest_approval_required": false}',
1, 1),

('tpl_screening_interview', 'Screening Interview', 'Quick 30-minute screening interview for initial candidate assessment', 'screening', 'screening', 30, 2,
'[
    {"text": "Brief introduction - tell me about your current role", "type": "open", "category": "background", "time_limit": 3},
    {"text": "What motivated you to apply for this position?", "type": "open", "category": "motivation", "time_limit": 3},
    {"text": "Walk me through your relevant experience", "type": "open", "category": "experience", "time_limit": 8},
    {"text": "What are your salary expectations?", "type": "open", "category": "compensation", "time_limit": 2},
    {"text": "When would you be available to start?", "type": "open", "category": "availability", "time_limit": 2},
    {"text": "Any initial questions about the role or company?", "type": "open", "category": "questions", "time_limit": 5}
]',
'{"phases": [{"name": "Quick Introduction", "duration": 5}, {"name": "Experience Review", "duration": 15}, {"name": "Logistics", "duration": 5}, {"name": "Q&A", "duration": 5}]}',
'{"recording_enabled": true, "auto_recording_enabled": false, "chat_enabled": false, "waiting_room_enabled": true, "guest_approval_required": false}',
1, 1);
