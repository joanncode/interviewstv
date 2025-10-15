-- AI Content Moderation System Tables
-- Migration: 015_create_ai_content_moderation_tables_sqlite.sql

-- Content moderation sessions
CREATE TABLE IF NOT EXISTS content_moderation_sessions (
    session_id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    moderation_mode TEXT NOT NULL DEFAULT 'auto', -- auto, manual, hybrid, disabled
    ai_models_enabled TEXT, -- JSON array of enabled AI models
    sensitivity_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, strict
    auto_action_enabled BOOLEAN DEFAULT 1,
    real_time_enabled BOOLEAN DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, stopped
    settings TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

-- Content analysis results
CREATE TABLE IF NOT EXISTS content_analysis_results (
    analysis_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL, -- text, audio, video, image
    content_text TEXT,
    content_metadata TEXT, -- JSON additional content data
    ai_analysis TEXT NOT NULL, -- JSON AI analysis results
    toxicity_score REAL DEFAULT 0.0,
    profanity_score REAL DEFAULT 0.0,
    hate_speech_score REAL DEFAULT 0.0,
    harassment_score REAL DEFAULT 0.0,
    threat_score REAL DEFAULT 0.0,
    spam_score REAL DEFAULT 0.0,
    adult_content_score REAL DEFAULT 0.0,
    violence_score REAL DEFAULT 0.0,
    overall_risk_score REAL DEFAULT 0.0,
    confidence_score REAL DEFAULT 0.0,
    processing_time_ms INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES content_moderation_sessions(session_id)
);

-- Moderation actions taken
CREATE TABLE IF NOT EXISTS moderation_actions (
    action_id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- allow, warn, filter, block, quarantine, escalate
    action_reason TEXT NOT NULL,
    auto_action BOOLEAN DEFAULT 1,
    moderator_id INTEGER,
    original_content TEXT,
    filtered_content TEXT,
    action_metadata TEXT, -- JSON additional action data
    severity_level TEXT, -- low, medium, high, critical
    user_notified BOOLEAN DEFAULT 0,
    escalated BOOLEAN DEFAULT 0,
    reversed BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES content_analysis_results(analysis_id),
    FOREIGN KEY (session_id) REFERENCES content_moderation_sessions(session_id)
);

-- AI model configurations and performance
CREATE TABLE IF NOT EXISTS ai_model_configs (
    config_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL, -- text, audio, video, image, multimodal
    provider TEXT NOT NULL, -- openai, google, azure, aws, custom
    api_endpoint TEXT,
    model_version TEXT,
    enabled BOOLEAN DEFAULT 1,
    confidence_threshold REAL DEFAULT 0.7,
    rate_limit_per_minute INTEGER DEFAULT 60,
    cost_per_request REAL DEFAULT 0.0,
    accuracy_score REAL DEFAULT 0.0,
    response_time_ms INTEGER DEFAULT 0,
    configuration TEXT, -- JSON model-specific config
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Content moderation rules and policies
CREATE TABLE IF NOT EXISTS moderation_rules (
    rule_id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- toxicity, profanity, hate_speech, spam, custom
    content_types TEXT NOT NULL, -- JSON array of applicable content types
    conditions TEXT NOT NULL, -- JSON rule conditions
    actions TEXT NOT NULL, -- JSON rule actions
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT 1,
    auto_apply BOOLEAN DEFAULT 1,
    threshold_score REAL DEFAULT 0.7,
    escalation_threshold REAL DEFAULT 0.9,
    cooldown_seconds INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User behavior tracking for moderation
CREATE TABLE IF NOT EXISTS user_moderation_history (
    history_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    violation_count INTEGER DEFAULT 1,
    severity_level TEXT NOT NULL,
    total_violations INTEGER DEFAULT 1,
    last_violation_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    warning_count INTEGER DEFAULT 0,
    temporary_restrictions TEXT, -- JSON restrictions data
    reputation_score REAL DEFAULT 1.0,
    risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
    auto_moderation_enabled BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES content_moderation_sessions(session_id)
);

-- Content appeals and reviews
CREATE TABLE IF NOT EXISTS content_appeals (
    appeal_id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    appeal_reason TEXT NOT NULL,
    appeal_text TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, escalated
    reviewer_id INTEGER,
    review_notes TEXT,
    original_decision TEXT,
    final_decision TEXT,
    appeal_metadata TEXT, -- JSON additional data
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (action_id) REFERENCES moderation_actions(action_id)
);

-- Moderation analytics and performance metrics
CREATE TABLE IF NOT EXISTS moderation_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    date_period TEXT NOT NULL, -- daily, weekly, monthly
    total_content_analyzed INTEGER DEFAULT 0,
    total_violations_detected INTEGER DEFAULT 0,
    auto_actions_taken INTEGER DEFAULT 0,
    manual_reviews_required INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    avg_processing_time_ms REAL DEFAULT 0.0,
    avg_confidence_score REAL DEFAULT 0.0,
    accuracy_rate REAL DEFAULT 0.0,
    user_satisfaction_score REAL DEFAULT 0.0,
    cost_analysis TEXT, -- JSON cost breakdown
    performance_metrics TEXT, -- JSON detailed metrics
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES content_moderation_sessions(session_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_content_moderation_sessions_interview ON content_moderation_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_sessions_user ON content_moderation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_sessions_status ON content_moderation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_content_analysis_session ON content_analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_timestamp ON content_analysis_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_content_analysis_content_type ON content_analysis_results(content_type);
CREATE INDEX IF NOT EXISTS idx_content_analysis_risk_score ON content_analysis_results(overall_risk_score);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_session ON moderation_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_analysis ON moderation_actions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_timestamp ON moderation_actions(timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_model_configs_enabled ON ai_model_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_type ON ai_model_configs(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_provider ON ai_model_configs(provider);

CREATE INDEX IF NOT EXISTS idx_moderation_rules_enabled ON moderation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_moderation_rules_type ON moderation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_moderation_rules_priority ON moderation_rules(priority);

CREATE INDEX IF NOT EXISTS idx_user_moderation_history_user ON user_moderation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_history_session ON user_moderation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_history_risk ON user_moderation_history(risk_level);

CREATE INDEX IF NOT EXISTS idx_content_appeals_action ON content_appeals(action_id);
CREATE INDEX IF NOT EXISTS idx_content_appeals_user ON content_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_content_appeals_status ON content_appeals(status);

CREATE INDEX IF NOT EXISTS idx_moderation_analytics_session ON moderation_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_moderation_analytics_period ON moderation_analytics(date_period);

-- Insert default AI model configurations
INSERT OR IGNORE INTO ai_model_configs (config_id, model_name, model_type, provider, confidence_threshold) VALUES
('openai_moderation', 'OpenAI Moderation', 'text', 'openai', 0.7),
('google_perspective', 'Google Perspective API', 'text', 'google', 0.7),
('azure_content_moderator', 'Azure Content Moderator', 'multimodal', 'azure', 0.7),
('aws_comprehend', 'AWS Comprehend', 'text', 'aws', 0.7),
('custom_profanity', 'Custom Profanity Filter', 'text', 'custom', 0.8);

-- Insert default moderation rules
INSERT OR IGNORE INTO moderation_rules (rule_id, rule_name, rule_type, content_types, conditions, actions, priority, description) VALUES
('rule_high_toxicity', 'High Toxicity Detection', 'toxicity', '["text", "audio"]', 
 '{"toxicity_threshold": 0.8, "confidence_threshold": 0.7}',
 '{"action": "block", "notify_user": true, "escalate": true}',
 1, 'Block content with high toxicity scores'),

('rule_profanity_filter', 'Profanity Filtering', 'profanity', '["text", "audio"]',
 '{"profanity_threshold": 0.6, "severity_levels": ["medium", "high", "severe"]}',
 '{"action": "filter", "replace_with": "[FILTERED]", "warn_user": true}',
 2, 'Filter and replace profane content'),

('rule_hate_speech', 'Hate Speech Detection', 'hate_speech', '["text", "audio"]',
 '{"hate_speech_threshold": 0.7, "identity_attack_threshold": 0.6}',
 '{"action": "quarantine", "require_review": true, "escalate": true}',
 1, 'Quarantine potential hate speech for review'),

('rule_spam_detection', 'Spam Content Detection', 'spam', '["text"]',
 '{"spam_threshold": 0.8, "repetition_threshold": 3, "link_threshold": 2}',
 '{"action": "warn", "rate_limit": true, "notify_moderators": false}',
 3, 'Detect and warn about spam content'),

('rule_adult_content', 'Adult Content Detection', 'adult_content', '["text", "image", "video"]',
 '{"adult_content_threshold": 0.7, "sexually_explicit_threshold": 0.6}',
 '{"action": "block", "age_gate": true, "require_review": true}',
 1, 'Block adult content in professional interviews');

-- Insert default user moderation settings
INSERT OR IGNORE INTO user_moderation_history (history_id, user_id, session_id, violation_type, violation_count, severity_level, total_violations) VALUES
('default_user_1', 1, 'default_session', 'none', 0, 'low', 0),
('default_user_2', 2, 'default_session', 'none', 0, 'low', 0);
