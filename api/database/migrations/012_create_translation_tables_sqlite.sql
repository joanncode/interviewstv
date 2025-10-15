-- Translation System Tables
-- Migration 012: Create real-time translation tables

-- Translation Requests Table
-- Stores translation requests and results
CREATE TABLE IF NOT EXISTS translation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- transcription, chat, text
    source_id VARCHAR(255), -- transcription_segment_id, chat_message_id, etc.
    interview_id VARCHAR(255),
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    translation_engine VARCHAR(100) DEFAULT 'google_translate', -- google_translate, azure, aws, libre
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    processing_time_ms INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cached
    error_message TEXT,
    created_at DATETIME NOT NULL,
    completed_at DATETIME,
    expires_at DATETIME -- For cache expiration
);

-- Translation Cache Table
-- Caches frequently used translations for performance
CREATE TABLE IF NOT EXISTS translation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) UNIQUE NOT NULL, -- MD5 hash of source_text + source_lang + target_lang
    source_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translated_text TEXT NOT NULL,
    translation_engine VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    usage_count INTEGER DEFAULT 1,
    last_used_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Real-time Translation Sessions Table
-- Manages active translation sessions for interviews
CREATE TABLE IF NOT EXISTS translation_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    interview_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    source_language VARCHAR(10) NOT NULL,
    target_languages TEXT NOT NULL, -- JSON array of target languages
    auto_translate BOOLEAN DEFAULT 1,
    translate_transcription BOOLEAN DEFAULT 1,
    translate_chat BOOLEAN DEFAULT 1,
    translation_engine VARCHAR(100) DEFAULT 'google_translate',
    quality_threshold DECIMAL(3,2) DEFAULT 0.70,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, stopped
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    ended_at DATETIME
);

-- Translation Analytics Table
-- Tracks translation usage and performance metrics
CREATE TABLE IF NOT EXISTS translation_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255),
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_translations INTEGER DEFAULT 0,
    failed_translations INTEGER DEFAULT 0,
    cached_translations INTEGER DEFAULT 0,
    average_processing_time DECIMAL(8,2) DEFAULT 0.00,
    total_characters_translated INTEGER DEFAULT 0,
    most_used_source_language VARCHAR(10),
    most_used_target_language VARCHAR(10),
    translation_engines_used TEXT, -- JSON object with engine usage counts
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Language Preferences Table
-- User language preferences and settings
CREATE TABLE IF NOT EXISTS user_language_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preferred_language VARCHAR(10) NOT NULL,
    auto_detect_language BOOLEAN DEFAULT 1,
    auto_translate_incoming BOOLEAN DEFAULT 0,
    preferred_translation_engine VARCHAR(100) DEFAULT 'google_translate',
    translation_quality_preference VARCHAR(20) DEFAULT 'balanced', -- fast, balanced, accurate
    show_original_text BOOLEAN DEFAULT 1,
    show_confidence_scores BOOLEAN DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Supported Languages Table
-- Maintains list of supported languages and their capabilities
CREATE TABLE IF NOT EXISTS supported_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code VARCHAR(10) UNIQUE NOT NULL,
    language_name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    supports_transcription BOOLEAN DEFAULT 0,
    supports_translation BOOLEAN DEFAULT 1,
    translation_engines TEXT, -- JSON array of supported engines
    quality_rating DECIMAL(3,2) DEFAULT 0.80, -- Overall quality rating
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Translation Feedback Table
-- User feedback on translation quality
CREATE TABLE IF NOT EXISTS translation_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_request_id INTEGER NOT NULL,
    user_id INTEGER,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50) DEFAULT 'quality', -- quality, accuracy, speed
    comments TEXT,
    suggested_translation TEXT,
    is_helpful BOOLEAN,
    created_at DATETIME NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_translation_requests_request_id ON translation_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_translation_requests_interview_id ON translation_requests(interview_id);
CREATE INDEX IF NOT EXISTS idx_translation_requests_source_type ON translation_requests(source_type);
CREATE INDEX IF NOT EXISTS idx_translation_requests_status ON translation_requests(status);
CREATE INDEX IF NOT EXISTS idx_translation_requests_created_at ON translation_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_translation_cache_cache_key ON translation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_translation_cache_languages ON translation_cache(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_cache_expires_at ON translation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_translation_cache_usage_count ON translation_cache(usage_count);

CREATE INDEX IF NOT EXISTS idx_translation_sessions_session_id ON translation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_interview_id ON translation_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_user_id ON translation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_status ON translation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_translation_analytics_interview_id ON translation_analytics(interview_id);
CREATE INDEX IF NOT EXISTS idx_translation_analytics_date ON translation_analytics(date);

CREATE INDEX IF NOT EXISTS idx_user_language_preferences_user_id ON user_language_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_supported_languages_code ON supported_languages(language_code);
CREATE INDEX IF NOT EXISTS idx_supported_languages_active ON supported_languages(is_active);

CREATE INDEX IF NOT EXISTS idx_translation_feedback_request_id ON translation_feedback(translation_request_id);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_user_id ON translation_feedback(user_id);

-- Insert default supported languages
INSERT OR IGNORE INTO supported_languages (language_code, language_name, native_name, supports_transcription, supports_translation, translation_engines, quality_rating, created_at) VALUES
('en', 'English', 'English', 1, 1, '["google_translate", "azure", "aws"]', 0.95, datetime('now')),
('es', 'Spanish', 'Español', 1, 1, '["google_translate", "azure", "aws"]', 0.93, datetime('now')),
('fr', 'French', 'Français', 1, 1, '["google_translate", "azure", "aws"]', 0.92, datetime('now')),
('de', 'German', 'Deutsch', 1, 1, '["google_translate", "azure", "aws"]', 0.91, datetime('now')),
('it', 'Italian', 'Italiano', 1, 1, '["google_translate", "azure", "aws"]', 0.90, datetime('now')),
('pt', 'Portuguese', 'Português', 1, 1, '["google_translate", "azure", "aws"]', 0.89, datetime('now')),
('ru', 'Russian', 'Русский', 1, 1, '["google_translate", "azure"]', 0.87, datetime('now')),
('ja', 'Japanese', '日本語', 1, 1, '["google_translate", "azure"]', 0.85, datetime('now')),
('ko', 'Korean', '한국어', 1, 1, '["google_translate", "azure"]', 0.84, datetime('now')),
('zh', 'Chinese', '中文', 1, 1, '["google_translate", "azure"]', 0.86, datetime('now')),
('ar', 'Arabic', 'العربية', 0, 1, '["google_translate", "azure"]', 0.82, datetime('now')),
('hi', 'Hindi', 'हिन्दी', 0, 1, '["google_translate", "azure"]', 0.80, datetime('now')),
('nl', 'Dutch', 'Nederlands', 0, 1, '["google_translate", "azure"]', 0.88, datetime('now')),
('sv', 'Swedish', 'Svenska', 0, 1, '["google_translate", "azure"]', 0.87, datetime('now')),
('no', 'Norwegian', 'Norsk', 0, 1, '["google_translate", "azure"]', 0.86, datetime('now'));
