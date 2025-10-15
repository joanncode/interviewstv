-- Real-time Sentiment Analysis System Tables
-- Migration: 017_create_sentiment_analysis_tables_sqlite.sql

-- Sentiment analysis sessions
CREATE TABLE IF NOT EXISTS sentiment_sessions (
    session_id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    analysis_mode TEXT NOT NULL DEFAULT 'real_time', -- real_time, batch, hybrid
    ai_models_enabled TEXT, -- JSON array of enabled AI models
    emotion_tracking_enabled BOOLEAN DEFAULT 1,
    mood_tracking_enabled BOOLEAN DEFAULT 1,
    confidence_tracking_enabled BOOLEAN DEFAULT 1,
    tone_analysis_enabled BOOLEAN DEFAULT 1,
    real_time_alerts BOOLEAN DEFAULT 1,
    sensitivity_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, custom
    language TEXT NOT NULL DEFAULT 'en',
    custom_emotions TEXT, -- JSON array of custom emotions to track
    alert_thresholds TEXT, -- JSON configuration for alert thresholds
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, completed, failed
    settings TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Real-time sentiment analysis results
CREATE TABLE IF NOT EXISTS sentiment_analysis_results (
    analysis_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    interview_id TEXT NOT NULL,
    participant_id TEXT, -- which participant this analysis relates to
    content_text TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'speech', -- speech, text, chat
    timestamp_ms INTEGER NOT NULL, -- timestamp in milliseconds from interview start
    overall_sentiment REAL DEFAULT 0.0, -- -1 to 1 scale
    confidence_score REAL DEFAULT 0.0, -- 0 to 1 scale
    emotional_intensity REAL DEFAULT 0.0, -- 0 to 1 scale
    mood_classification TEXT, -- positive, negative, neutral, mixed
    dominant_emotion TEXT, -- primary emotion detected
    emotions_data TEXT, -- JSON detailed emotion scores
    tone_analysis TEXT, -- JSON tone characteristics
    key_phrases TEXT, -- JSON array of emotionally significant phrases
    sentiment_change REAL DEFAULT 0.0, -- change from previous analysis
    processing_time_ms INTEGER DEFAULT 0,
    ai_model_used TEXT,
    confidence_factors TEXT, -- JSON factors affecting confidence
    alert_triggered BOOLEAN DEFAULT 0,
    alert_type TEXT, -- type of alert if triggered
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Emotion tracking over time
CREATE TABLE IF NOT EXISTS emotion_timeline (
    timeline_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    participant_id TEXT,
    time_segment INTEGER NOT NULL, -- segment number (e.g., 1-10 for 10 segments)
    segment_start_ms INTEGER NOT NULL,
    segment_end_ms INTEGER NOT NULL,
    segment_duration_ms INTEGER NOT NULL,
    primary_emotion TEXT NOT NULL,
    emotion_scores TEXT NOT NULL, -- JSON emotion scores for this segment
    sentiment_trend TEXT, -- improving, declining, stable
    emotional_volatility REAL DEFAULT 0.0, -- measure of emotional changes
    key_moments TEXT, -- JSON array of significant emotional moments
    segment_summary TEXT, -- brief summary of emotional state
    confidence_level REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Mood and atmosphere tracking
CREATE TABLE IF NOT EXISTS mood_tracking (
    mood_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    interview_id TEXT NOT NULL,
    overall_mood TEXT NOT NULL, -- positive, negative, neutral, tense, relaxed, energetic, calm
    mood_score REAL DEFAULT 0.0, -- -1 to 1 scale
    atmosphere_rating TEXT, -- professional, casual, formal, friendly, tense, comfortable
    energy_level REAL DEFAULT 0.0, -- 0 to 1 scale
    engagement_level REAL DEFAULT 0.0, -- 0 to 1 scale
    stress_indicators TEXT, -- JSON array of stress indicators detected
    comfort_indicators TEXT, -- JSON array of comfort indicators detected
    interaction_quality TEXT, -- excellent, good, fair, poor
    communication_flow TEXT, -- smooth, choppy, natural, forced
    mood_factors TEXT, -- JSON factors contributing to mood assessment
    recommendations TEXT, -- JSON recommendations for mood improvement
    timestamp_ms INTEGER NOT NULL,
    duration_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Sentiment alerts and notifications
CREATE TABLE IF NOT EXISTS sentiment_alerts (
    alert_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    analysis_id TEXT,
    alert_type TEXT NOT NULL, -- negative_sentiment, high_stress, low_confidence, mood_change, emotional_spike
    severity_level TEXT NOT NULL, -- low, medium, high, critical
    alert_message TEXT NOT NULL,
    triggered_by TEXT, -- what triggered the alert (sentiment_drop, emotion_spike, etc.)
    threshold_value REAL,
    actual_value REAL,
    participant_id TEXT,
    timestamp_ms INTEGER NOT NULL,
    acknowledged BOOLEAN DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at DATETIME,
    action_taken TEXT, -- action taken in response to alert
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Sentiment analysis models and configuration
CREATE TABLE IF NOT EXISTS sentiment_models (
    model_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL, -- openai, azure, aws, google, custom
    model_version TEXT,
    capabilities TEXT, -- JSON array of capabilities (sentiment, emotion, tone, etc.)
    accuracy_rating REAL DEFAULT 0.0,
    processing_speed_ms REAL DEFAULT 0.0,
    cost_per_analysis REAL DEFAULT 0.0,
    language_support TEXT, -- JSON array of supported languages
    emotion_categories TEXT, -- JSON array of emotions this model can detect
    confidence_threshold REAL DEFAULT 0.7,
    enabled BOOLEAN DEFAULT 1,
    configuration TEXT, -- JSON model-specific configuration
    performance_metrics TEXT, -- JSON performance data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sentiment feedback and training data
CREATE TABLE IF NOT EXISTS sentiment_feedback (
    feedback_id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    feedback_type TEXT NOT NULL, -- accuracy, emotion_detection, tone_analysis, overall
    original_sentiment REAL,
    corrected_sentiment REAL,
    original_emotions TEXT, -- JSON original emotion scores
    corrected_emotions TEXT, -- JSON corrected emotion scores
    feedback_notes TEXT,
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    suggestions TEXT,
    training_data_consent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES sentiment_analysis_results(analysis_id),
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Sentiment analytics and reporting
CREATE TABLE IF NOT EXISTS sentiment_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT,
    interview_id TEXT,
    date_period TEXT NOT NULL, -- daily, weekly, monthly
    total_analyses INTEGER DEFAULT 0,
    avg_sentiment_score REAL DEFAULT 0.0,
    sentiment_distribution TEXT, -- JSON distribution of positive/negative/neutral
    most_common_emotion TEXT,
    emotion_distribution TEXT, -- JSON emotion frequency distribution
    mood_trends TEXT, -- JSON mood changes over time
    alert_frequency INTEGER DEFAULT 0,
    alert_types_distribution TEXT, -- JSON alert type frequencies
    accuracy_metrics TEXT, -- JSON accuracy and performance metrics
    processing_performance TEXT, -- JSON processing time and efficiency metrics
    user_satisfaction REAL DEFAULT 0.0,
    improvement_suggestions TEXT, -- JSON suggestions for system improvement
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sentiment_sessions(session_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sentiment_sessions_interview ON sentiment_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_sessions_user ON sentiment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_sessions_status ON sentiment_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sentiment_results_session ON sentiment_analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_interview ON sentiment_analysis_results(interview_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_participant ON sentiment_analysis_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_timestamp ON sentiment_analysis_results(timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_sentiment ON sentiment_analysis_results(overall_sentiment);

CREATE INDEX IF NOT EXISTS idx_emotion_timeline_session ON emotion_timeline(session_id);
CREATE INDEX IF NOT EXISTS idx_emotion_timeline_participant ON emotion_timeline(participant_id);
CREATE INDEX IF NOT EXISTS idx_emotion_timeline_segment ON emotion_timeline(time_segment);

CREATE INDEX IF NOT EXISTS idx_mood_tracking_session ON mood_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_mood_tracking_interview ON mood_tracking(interview_id);
CREATE INDEX IF NOT EXISTS idx_mood_tracking_timestamp ON mood_tracking(timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_session ON sentiment_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_type ON sentiment_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_severity ON sentiment_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_timestamp ON sentiment_alerts(timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_sentiment_models_provider ON sentiment_models(provider);
CREATE INDEX IF NOT EXISTS idx_sentiment_models_enabled ON sentiment_models(enabled);

CREATE INDEX IF NOT EXISTS idx_sentiment_feedback_analysis ON sentiment_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_feedback_session ON sentiment_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_feedback_user ON sentiment_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_sentiment_analytics_session ON sentiment_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analytics_period ON sentiment_analytics(date_period);

-- Insert default sentiment analysis models
INSERT OR IGNORE INTO sentiment_models (model_id, model_name, provider, capabilities, accuracy_rating, processing_speed_ms, language_support, emotion_categories, enabled) VALUES
('openai_gpt4_sentiment', 'GPT-4 Sentiment Analysis', 'openai', '["sentiment", "emotion", "tone", "confidence"]', 0.92, 1200, '["en", "es", "fr", "de", "it"]', '["joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation", "enthusiasm", "nervousness", "confidence", "frustration"]', 1),

('azure_text_analytics', 'Azure Text Analytics', 'azure', '["sentiment", "emotion", "key_phrases"]', 0.88, 800, '["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"]', '["joy", "sadness", "anger", "fear", "surprise", "neutral"]', 1),

('aws_comprehend', 'AWS Comprehend', 'aws', '["sentiment", "key_phrases", "language_detection"]', 0.85, 600, '["en", "es", "fr", "de", "it", "pt", "ar", "hi", "ja", "ko", "zh"]', '["positive", "negative", "neutral", "mixed"]', 1),

('google_natural_language', 'Google Natural Language AI', 'google', '["sentiment", "emotion", "entity_analysis", "syntax"]', 0.90, 700, '["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"]', '["joy", "sadness", "anger", "fear", "surprise"]', 1),

('custom_emotion_detector', 'Custom Emotion Detector', 'custom', '["emotion", "mood", "stress_detection", "confidence"]', 0.82, 400, '["en"]', '["joy", "enthusiasm", "nervousness", "frustration", "excitement", "anxiety", "determination", "satisfaction", "stress", "comfort"]', 1);

-- Insert sample sentiment session for demo
INSERT OR IGNORE INTO sentiment_sessions (session_id, interview_id, user_id, analysis_mode, ai_models_enabled, status) VALUES
('demo_sentiment_session', 'demo_interview_001', 1, 'real_time', '["openai_gpt4_sentiment", "custom_emotion_detector"]', 'completed');
