-- Smart Camera Switching System Tables
-- Migration: 014_create_smart_camera_tables_sqlite.sql

-- Camera switching sessions
CREATE TABLE IF NOT EXISTS camera_switching_sessions (
    session_id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'manual', -- manual, auto, hybrid
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, stopped
    settings TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

-- Camera switching events log
CREATE TABLE IF NOT EXISTS camera_switching_events (
    event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    switch_type TEXT NOT NULL, -- auto, manual, fallback
    trigger_reason TEXT, -- speaker_change, audio_level, engagement, manual
    confidence_score REAL DEFAULT 0.0,
    audio_level REAL DEFAULT 0.0,
    speaker_detected TEXT,
    engagement_score REAL DEFAULT 0.0,
    switch_duration_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    metadata TEXT, -- JSON additional data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES camera_switching_sessions(session_id)
);

-- Camera configurations and capabilities
CREATE TABLE IF NOT EXISTS camera_configurations (
    config_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    camera_name TEXT,
    position TEXT, -- host, guest, wide, close
    priority INTEGER DEFAULT 1, -- 1=highest, 10=lowest
    auto_switch_enabled BOOLEAN DEFAULT 1,
    audio_threshold REAL DEFAULT 0.1,
    engagement_threshold REAL DEFAULT 0.5,
    quality_settings TEXT, -- JSON video quality settings
    constraints TEXT, -- JSON camera constraints
    status TEXT DEFAULT 'active', -- active, inactive, error
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES camera_switching_sessions(session_id)
);

-- Audio analysis data for smart switching
CREATE TABLE IF NOT EXISTS audio_analysis_data (
    analysis_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    speaker_detected TEXT,
    speaker_confidence REAL DEFAULT 0.0,
    audio_level REAL DEFAULT 0.0,
    background_noise REAL DEFAULT 0.0,
    speech_quality REAL DEFAULT 0.0,
    voice_activity BOOLEAN DEFAULT 0,
    dominant_frequency REAL DEFAULT 0.0,
    audio_features TEXT, -- JSON additional audio features
    processing_time_ms INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES camera_switching_sessions(session_id)
);

-- Engagement metrics for camera switching decisions
CREATE TABLE IF NOT EXISTS engagement_metrics (
    metric_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    participant_id TEXT,
    engagement_score REAL DEFAULT 0.0,
    attention_level REAL DEFAULT 0.0,
    interaction_count INTEGER DEFAULT 0,
    speech_activity REAL DEFAULT 0.0,
    gesture_activity REAL DEFAULT 0.0,
    facial_expression TEXT,
    emotion_detected TEXT,
    confidence_level REAL DEFAULT 0.0,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES camera_switching_sessions(session_id)
);

-- Smart switching rules and algorithms
CREATE TABLE IF NOT EXISTS switching_rules (
    rule_id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- speaker_based, audio_level, engagement, time_based, hybrid
    conditions TEXT NOT NULL, -- JSON rule conditions
    actions TEXT NOT NULL, -- JSON rule actions
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT 1,
    min_confidence REAL DEFAULT 0.6,
    cooldown_seconds INTEGER DEFAULT 3,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance analytics for smart switching
CREATE TABLE IF NOT EXISTS switching_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    total_switches INTEGER DEFAULT 0,
    auto_switches INTEGER DEFAULT 0,
    manual_switches INTEGER DEFAULT 0,
    successful_switches INTEGER DEFAULT 0,
    failed_switches INTEGER DEFAULT 0,
    avg_switch_time_ms REAL DEFAULT 0.0,
    avg_confidence_score REAL DEFAULT 0.0,
    speaker_detection_accuracy REAL DEFAULT 0.0,
    engagement_correlation REAL DEFAULT 0.0,
    user_satisfaction_score REAL DEFAULT 0.0,
    performance_score REAL DEFAULT 0.0,
    recommendations TEXT, -- JSON improvement suggestions
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES camera_switching_sessions(session_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_camera_switching_sessions_interview ON camera_switching_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_camera_switching_sessions_user ON camera_switching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_camera_switching_sessions_status ON camera_switching_sessions(status);

CREATE INDEX IF NOT EXISTS idx_camera_switching_events_session ON camera_switching_events(session_id);
CREATE INDEX IF NOT EXISTS idx_camera_switching_events_timestamp ON camera_switching_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_camera_switching_events_trigger ON camera_switching_events(trigger_reason);

CREATE INDEX IF NOT EXISTS idx_camera_configurations_session ON camera_configurations(session_id);
CREATE INDEX IF NOT EXISTS idx_camera_configurations_camera ON camera_configurations(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_configurations_priority ON camera_configurations(priority);

CREATE INDEX IF NOT EXISTS idx_audio_analysis_session ON audio_analysis_data(session_id);
CREATE INDEX IF NOT EXISTS idx_audio_analysis_timestamp ON audio_analysis_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_audio_analysis_speaker ON audio_analysis_data(speaker_detected);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_session ON engagement_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_timestamp ON engagement_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_participant ON engagement_metrics(participant_id);

CREATE INDEX IF NOT EXISTS idx_switching_rules_type ON switching_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_switching_rules_enabled ON switching_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_switching_rules_priority ON switching_rules(priority);

CREATE INDEX IF NOT EXISTS idx_switching_analytics_session ON switching_analytics(session_id);

-- Insert default switching rules
INSERT OR IGNORE INTO switching_rules (rule_id, rule_name, rule_type, conditions, actions, priority, description) VALUES
('rule_speaker_change', 'Speaker Change Detection', 'speaker_based', 
 '{"min_confidence": 0.8, "min_audio_level": 0.1, "speaker_change_threshold": 2.0}',
 '{"switch_to": "speaker_camera", "transition_type": "smooth", "duration_ms": 1000}',
 1, 'Switch camera when a different speaker is detected'),

('rule_audio_level', 'Audio Level Switching', 'audio_level',
 '{"min_audio_level": 0.3, "sustained_duration": 1.5, "background_noise_threshold": 0.2}',
 '{"switch_to": "active_speaker", "transition_type": "fade", "duration_ms": 800}',
 2, 'Switch to camera with highest audio activity'),

('rule_engagement_peak', 'High Engagement Switching', 'engagement',
 '{"min_engagement": 0.7, "sustained_duration": 3.0, "interaction_threshold": 2}',
 '{"switch_to": "engaged_participant", "transition_type": "zoom", "duration_ms": 1200}',
 3, 'Switch to highly engaged participants'),

('rule_silence_fallback', 'Silence Fallback', 'time_based',
 '{"silence_duration": 5.0, "min_audio_level": 0.05}',
 '{"switch_to": "wide_shot", "transition_type": "smooth", "duration_ms": 1500}',
 4, 'Switch to wide shot during extended silence'),

('rule_hybrid_intelligent', 'Hybrid Intelligent Switching', 'hybrid',
 '{"speaker_weight": 0.4, "audio_weight": 0.3, "engagement_weight": 0.3, "min_combined_score": 0.6}',
 '{"switch_to": "best_candidate", "transition_type": "smart", "duration_ms": 1000}',
 5, 'Intelligent switching based on multiple factors');

-- Insert default camera positions
INSERT OR IGNORE INTO camera_configurations (config_id, session_id, camera_id, device_id, camera_name, position, priority) VALUES
('default_host', 'default_session', 'host_cam', 'device_1', 'Host Camera', 'host', 1),
('default_guest', 'default_session', 'guest_cam', 'device_2', 'Guest Camera', 'guest', 2),
('default_wide', 'default_session', 'wide_cam', 'device_3', 'Wide Shot', 'wide', 3),
('default_close', 'default_session', 'close_cam', 'device_4', 'Close Up', 'close', 4);
