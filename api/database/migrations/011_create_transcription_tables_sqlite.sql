-- Transcription System Tables
-- Migration 011: Create transcription and AI features tables

-- Interview Transcriptions Table
-- Stores complete transcription data for interviews
CREATE TABLE IF NOT EXISTS interview_transcriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(50) DEFAULT 'processing', -- processing, completed, failed, reviewing
    transcription_engine VARCHAR(100) DEFAULT 'web_speech_api', -- web_speech_api, azure, google, aws
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    word_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    full_transcript TEXT,
    metadata TEXT, -- JSON: speaker_count, language_detected, etc.
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    completed_at DATETIME
);

-- Transcription Segments Table
-- Stores individual transcript segments with timestamps
CREATE TABLE IF NOT EXISTS transcription_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transcription_id INTEGER NOT NULL,
    speaker_id VARCHAR(255), -- guest_id or host_id
    speaker_name VARCHAR(255),
    speaker_type VARCHAR(50) DEFAULT 'participant', -- host, guest, participant
    start_time DECIMAL(10,3) NOT NULL, -- Timestamp in seconds
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.00,
    language VARCHAR(10) DEFAULT 'en',
    is_final BOOLEAN DEFAULT 0, -- Whether this is final or interim result
    word_timestamps TEXT, -- JSON array of word-level timestamps
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Real-time Transcription Buffer Table
-- Temporary storage for live transcription during interviews
CREATE TABLE IF NOT EXISTS realtime_transcription_buffer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255) NOT NULL,
    speaker_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    sequence_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.00,
    is_final BOOLEAN DEFAULT 0,
    timestamp_offset DECIMAL(10,3) NOT NULL, -- Offset from interview start
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL -- Auto-cleanup after interview ends
);

-- Transcription Corrections Table
-- Manual corrections and edits to transcriptions
CREATE TABLE IF NOT EXISTS transcription_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    correction_type VARCHAR(50) DEFAULT 'manual', -- manual, auto, ai_suggested
    corrected_by INTEGER, -- user_id
    confidence_improvement DECIMAL(3,2) DEFAULT 0.00,
    created_at DATETIME NOT NULL
);

-- Speaker Identification Table
-- AI-powered speaker identification and voice profiles
CREATE TABLE IF NOT EXISTS speaker_identification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255) NOT NULL,
    speaker_id VARCHAR(255) NOT NULL,
    voice_profile_id VARCHAR(255),
    speaker_name VARCHAR(255),
    confidence DECIMAL(3,2) DEFAULT 0.00,
    voice_characteristics TEXT, -- JSON: pitch, tone, accent, etc.
    speaking_time_seconds INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Transcription Analytics Table
-- Analytics and insights from transcription data
CREATE TABLE IF NOT EXISTS transcription_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id VARCHAR(255) NOT NULL,
    total_words INTEGER DEFAULT 0,
    unique_words INTEGER DEFAULT 0,
    speaking_pace DECIMAL(5,2) DEFAULT 0.00, -- Words per minute
    silence_percentage DECIMAL(5,2) DEFAULT 0.00,
    interruption_count INTEGER DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2) DEFAULT 0.00, -- -1 to 1
    engagement_score DECIMAL(3,2) DEFAULT 0.00, -- 0 to 1
    key_topics TEXT, -- JSON array of identified topics
    language_complexity DECIMAL(3,2) DEFAULT 0.00,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Transcription Settings Table
-- User and system settings for transcription
CREATE TABLE IF NOT EXISTS transcription_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    interview_id VARCHAR(255),
    setting_type VARCHAR(50) DEFAULT 'user', -- user, interview, system
    auto_transcription BOOLEAN DEFAULT 1,
    language_preference VARCHAR(10) DEFAULT 'en',
    transcription_engine VARCHAR(100) DEFAULT 'web_speech_api',
    real_time_display BOOLEAN DEFAULT 1,
    speaker_identification BOOLEAN DEFAULT 1,
    profanity_filter BOOLEAN DEFAULT 0,
    punctuation_auto BOOLEAN DEFAULT 1,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
    settings_json TEXT, -- Additional JSON settings
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_transcriptions_interview_id ON interview_transcriptions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcriptions_status ON interview_transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_interview_transcriptions_created_at ON interview_transcriptions(created_at);

CREATE INDEX IF NOT EXISTS idx_transcription_segments_transcription_id ON transcription_segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_speaker_id ON transcription_segments(speaker_id);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_start_time ON transcription_segments(start_time);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_is_final ON transcription_segments(is_final);

CREATE INDEX IF NOT EXISTS idx_realtime_buffer_interview_id ON realtime_transcription_buffer(interview_id);
CREATE INDEX IF NOT EXISTS idx_realtime_buffer_session_id ON realtime_transcription_buffer(session_id);
CREATE INDEX IF NOT EXISTS idx_realtime_buffer_expires_at ON realtime_transcription_buffer(expires_at);

CREATE INDEX IF NOT EXISTS idx_transcription_corrections_segment_id ON transcription_corrections(segment_id);
CREATE INDEX IF NOT EXISTS idx_transcription_corrections_corrected_by ON transcription_corrections(corrected_by);

CREATE INDEX IF NOT EXISTS idx_speaker_identification_interview_id ON speaker_identification(interview_id);
CREATE INDEX IF NOT EXISTS idx_speaker_identification_speaker_id ON speaker_identification(speaker_id);

CREATE INDEX IF NOT EXISTS idx_transcription_analytics_interview_id ON transcription_analytics(interview_id);

CREATE INDEX IF NOT EXISTS idx_transcription_settings_user_id ON transcription_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_settings_interview_id ON transcription_settings(interview_id);
CREATE INDEX IF NOT EXISTS idx_transcription_settings_setting_type ON transcription_settings(setting_type);

-- Insert default system settings
INSERT OR IGNORE INTO transcription_settings (
    id, user_id, interview_id, setting_type, auto_transcription, language_preference,
    transcription_engine, real_time_display, speaker_identification, profanity_filter,
    punctuation_auto, confidence_threshold, created_at
) VALUES (
    1, NULL, NULL, 'system', 1, 'en', 'web_speech_api', 1, 1, 0, 1, 0.70, datetime('now')
);
