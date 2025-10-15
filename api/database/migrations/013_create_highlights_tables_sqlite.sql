-- AI-Powered Highlights System Tables
-- Migration 013: Create intelligent highlights detection tables

-- Interview Highlights Table
-- Stores detected highlights with AI analysis
CREATE TABLE IF NOT EXISTS interview_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    highlight_id VARCHAR(255) UNIQUE NOT NULL,
    interview_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    highlight_type VARCHAR(50) NOT NULL, -- key_moment, important_quote, emotional_peak, topic_change, insight, question_answer, breakthrough, conclusion
    start_time DECIMAL(10,3) NOT NULL, -- Start time in seconds
    end_time DECIMAL(10,3) NOT NULL, -- End time in seconds
    duration DECIMAL(8,3) NOT NULL, -- Duration in seconds
    confidence_score DECIMAL(3,2) DEFAULT 0.00, -- AI confidence (0.00-1.00)
    importance_score DECIMAL(3,2) DEFAULT 0.00, -- Importance rating (0.00-1.00)
    engagement_score DECIMAL(3,2) DEFAULT 0.00, -- Audience engagement potential (0.00-1.00)
    transcript_text TEXT, -- Associated transcript text
    speaker_id VARCHAR(255), -- Primary speaker for this highlight
    keywords TEXT, -- JSON array of extracted keywords
    topics TEXT, -- JSON array of identified topics
    emotions TEXT, -- JSON object with emotion analysis
    ai_analysis TEXT, -- Detailed AI analysis and reasoning
    thumbnail_url VARCHAR(500), -- Generated thumbnail image
    video_clip_url VARCHAR(500), -- Generated video clip
    status VARCHAR(50) DEFAULT 'detected', -- detected, reviewed, approved, rejected, featured
    manual_override BOOLEAN DEFAULT 0, -- Whether manually edited
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    reviewed_at DATETIME,
    reviewed_by INTEGER -- User ID who reviewed
);

-- Highlight Detection Rules Table
-- Configurable rules for highlight detection
CREATE TABLE IF NOT EXISTS highlight_detection_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id VARCHAR(255) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- keyword, emotion, audio_level, speech_pattern, topic_change, engagement
    rule_config TEXT NOT NULL, -- JSON configuration for the rule
    weight DECIMAL(3,2) DEFAULT 1.00, -- Rule weight in scoring
    min_confidence DECIMAL(3,2) DEFAULT 0.70, -- Minimum confidence to trigger
    is_active BOOLEAN DEFAULT 1,
    applies_to_types TEXT, -- JSON array of interview types this rule applies to
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Highlight Keywords Table
-- Important keywords and phrases for detection
CREATE TABLE IF NOT EXISTS highlight_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- breakthrough, insight, emotion, question, conclusion, technical, business
    weight DECIMAL(3,2) DEFAULT 1.00,
    context_required BOOLEAN DEFAULT 0, -- Whether context analysis is needed
    language_code VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME NOT NULL
);

-- Highlight Analytics Table
-- Analytics and performance metrics for highlights
CREATE TABLE IF NOT EXISTS highlight_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255),
    highlight_id VARCHAR(255),
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    watch_time_seconds INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    click_through_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Highlight Feedback Table
-- User feedback on highlight quality and relevance
CREATE TABLE IF NOT EXISTS highlight_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    highlight_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    feedback_type VARCHAR(50) NOT NULL, -- quality, relevance, accuracy, timing
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    is_helpful BOOLEAN,
    comments TEXT,
    suggested_start_time DECIMAL(10,3),
    suggested_end_time DECIMAL(10,3),
    suggested_title VARCHAR(255),
    created_at DATETIME NOT NULL
);

-- Highlight Templates Table
-- Predefined templates for different types of highlights
CREATE TABLE IF NOT EXISTS highlight_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id VARCHAR(255) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    highlight_type VARCHAR(50) NOT NULL,
    title_template VARCHAR(500), -- Template with placeholders like {speaker}, {topic}, {emotion}
    description_template TEXT,
    detection_criteria TEXT, -- JSON object with detection criteria
    min_duration DECIMAL(8,3) DEFAULT 5.00, -- Minimum duration in seconds
    max_duration DECIMAL(8,3) DEFAULT 120.00, -- Maximum duration in seconds
    priority INTEGER DEFAULT 1, -- Template priority (1-10)
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Highlight Processing Queue Table
-- Queue for processing highlights asynchronously
CREATE TABLE IF NOT EXISTS highlight_processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id VARCHAR(255) UNIQUE NOT NULL,
    interview_id VARCHAR(255) NOT NULL,
    processing_type VARCHAR(50) NOT NULL, -- detection, analysis, thumbnail, clip_generation
    priority INTEGER DEFAULT 1, -- Processing priority (1-10)
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    progress_percentage INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    result_data TEXT, -- JSON result data
    created_at DATETIME NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_highlights_interview_id ON interview_highlights(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_type ON interview_highlights(highlight_type);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_confidence ON interview_highlights(confidence_score);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_importance ON interview_highlights(importance_score);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_status ON interview_highlights(status);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_start_time ON interview_highlights(start_time);
CREATE INDEX IF NOT EXISTS idx_interview_highlights_created_at ON interview_highlights(created_at);

CREATE INDEX IF NOT EXISTS idx_highlight_detection_rules_type ON highlight_detection_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_highlight_detection_rules_active ON highlight_detection_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_highlight_keywords_category ON highlight_keywords(category);
CREATE INDEX IF NOT EXISTS idx_highlight_keywords_language ON highlight_keywords(language_code);
CREATE INDEX IF NOT EXISTS idx_highlight_keywords_active ON highlight_keywords(is_active);

CREATE INDEX IF NOT EXISTS idx_highlight_analytics_interview_id ON highlight_analytics(interview_id);
CREATE INDEX IF NOT EXISTS idx_highlight_analytics_highlight_id ON highlight_analytics(highlight_id);
CREATE INDEX IF NOT EXISTS idx_highlight_analytics_date ON highlight_analytics(date);

CREATE INDEX IF NOT EXISTS idx_highlight_feedback_highlight_id ON highlight_feedback(highlight_id);
CREATE INDEX IF NOT EXISTS idx_highlight_feedback_user_id ON highlight_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_highlight_templates_type ON highlight_templates(highlight_type);
CREATE INDEX IF NOT EXISTS idx_highlight_templates_active ON highlight_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_highlight_processing_queue_interview_id ON highlight_processing_queue(interview_id);
CREATE INDEX IF NOT EXISTS idx_highlight_processing_queue_status ON highlight_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_highlight_processing_queue_priority ON highlight_processing_queue(priority);

-- Insert default detection rules
INSERT OR IGNORE INTO highlight_detection_rules (rule_id, rule_name, rule_type, rule_config, weight, min_confidence, applies_to_types, created_at) VALUES
('keyword_breakthrough', 'Breakthrough Keywords', 'keyword', '{"keywords": ["breakthrough", "discovery", "revelation", "aha moment", "eureka", "game changer"], "context_window": 30}', 0.90, 0.75, '["technical", "business", "research"]', datetime('now')),
('emotion_excitement', 'Excitement Detection', 'emotion', '{"emotions": ["excitement", "enthusiasm", "joy"], "threshold": 0.7, "duration": 10}', 0.85, 0.70, '["all"]', datetime('now')),
('audio_emphasis', 'Audio Emphasis', 'audio_level', '{"volume_increase": 1.5, "duration": 5, "context_window": 15}', 0.80, 0.65, '["all"]', datetime('now')),
('topic_transition', 'Topic Change', 'topic_change', '{"similarity_threshold": 0.3, "min_duration": 20}', 0.75, 0.60, '["all"]', datetime('now')),
('question_answer', 'Important Q&A', 'speech_pattern', '{"patterns": ["question_mark", "answer_confidence"], "min_length": 50}', 0.85, 0.70, '["interview", "qa"]', datetime('now'));

-- Insert default keywords
INSERT OR IGNORE INTO highlight_keywords (keyword, category, weight, language_code, created_at) VALUES
('breakthrough', 'breakthrough', 1.00, 'en', datetime('now')),
('discovery', 'breakthrough', 0.95, 'en', datetime('now')),
('innovation', 'breakthrough', 0.90, 'en', datetime('now')),
('game changer', 'breakthrough', 0.95, 'en', datetime('now')),
('revolutionary', 'breakthrough', 0.90, 'en', datetime('now')),
('insight', 'insight', 0.85, 'en', datetime('now')),
('realization', 'insight', 0.80, 'en', datetime('now')),
('understanding', 'insight', 0.75, 'en', datetime('now')),
('perspective', 'insight', 0.70, 'en', datetime('now')),
('excited', 'emotion', 0.80, 'en', datetime('now')),
('passionate', 'emotion', 0.85, 'en', datetime('now')),
('frustrated', 'emotion', 0.75, 'en', datetime('now')),
('concerned', 'emotion', 0.70, 'en', datetime('now')),
('important question', 'question', 0.90, 'en', datetime('now')),
('key point', 'insight', 0.85, 'en', datetime('now')),
('in conclusion', 'conclusion', 0.95, 'en', datetime('now')),
('to summarize', 'conclusion', 0.90, 'en', datetime('now')),
('bottom line', 'conclusion', 0.85, 'en', datetime('now'));

-- Insert default templates
INSERT OR IGNORE INTO highlight_templates (template_id, template_name, highlight_type, title_template, description_template, detection_criteria, min_duration, max_duration, priority, created_at) VALUES
('breakthrough_moment', 'Breakthrough Moment', 'breakthrough', '{speaker} shares a breakthrough about {topic}', 'A significant discovery or realization that could change the direction of the conversation', '{"keywords": ["breakthrough", "discovery"], "emotion_threshold": 0.7}', 10.0, 60.0, 9, datetime('now')),
('key_insight', 'Key Insight', 'insight', 'Important insight on {topic}', 'A valuable perspective or understanding shared during the interview', '{"keywords": ["insight", "realization"], "confidence": 0.75}', 8.0, 45.0, 8, datetime('now')),
('emotional_peak', 'Emotional Moment', 'emotional_peak', '{speaker} gets {emotion} about {topic}', 'A moment of high emotional engagement that resonates with the audience', '{"emotion_threshold": 0.8, "duration": 15}', 5.0, 30.0, 7, datetime('now')),
('important_qa', 'Important Q&A', 'question_answer', 'Q&A: {topic}', 'A significant question and answer exchange that provides valuable information', '{"question_confidence": 0.8, "answer_length": 100}', 15.0, 90.0, 8, datetime('now')),
('topic_introduction', 'New Topic', 'topic_change', 'Discussion shifts to {topic}', 'Introduction of a new important topic or theme in the conversation', '{"topic_similarity": 0.3, "importance": 0.7}', 5.0, 20.0, 6, datetime('now'));
