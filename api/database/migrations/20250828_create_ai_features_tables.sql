-- AI Features Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for AI-powered features with toggle controls

-- AI Feature Settings Table
CREATE TABLE IF NOT EXISTS ai_feature_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feature_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON COMMENT 'Feature-specific configuration',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_feature_name (feature_name),
    INDEX idx_feature_name (feature_name),
    INDEX idx_is_enabled (is_enabled),
    INDEX idx_is_active (is_active)
);

-- AI Transcriptions Table
CREATE TABLE IF NOT EXISTS ai_transcriptions (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NULL,
    interview_id INT NULL,
    stream_id VARCHAR(50) NULL,
    text LONGTEXT NOT NULL,
    segments JSON COMMENT 'Timestamped segments',
    words JSON COMMENT 'Word-level timestamps',
    language VARCHAR(10) DEFAULT 'en',
    duration INT DEFAULT 0 COMMENT 'Audio duration in seconds',
    confidence DECIMAL(3,2) DEFAULT 0.80,
    model_used VARCHAR(50) DEFAULT 'whisper-1',
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    processing_time DECIMAL(8,3) DEFAULT 0.000 COMMENT 'Processing time in seconds',
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE SET NULL,
    FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_interview_id (interview_id),
    INDEX idx_stream_id (stream_id),
    INDEX idx_language (language),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_text_search (text)
);

-- AI Content Suggestions Table
CREATE TABLE IF NOT EXISTS ai_content_suggestions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    content_hash VARCHAR(64) NOT NULL COMMENT 'MD5 hash of source content',
    content_type VARCHAR(50) DEFAULT 'interview',
    suggestions JSON NOT NULL COMMENT 'Generated suggestions',
    model_used VARCHAR(50) DEFAULT 'gpt-4',
    confidence DECIMAL(3,2) DEFAULT 0.80,
    accepted BOOLEAN DEFAULT FALSE,
    feedback_rating INT NULL COMMENT '1-5 rating from user',
    feedback_comment TEXT,
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_content_hash (content_hash),
    INDEX idx_content_type (content_type),
    INDEX idx_accepted (accepted),
    INDEX idx_created_at (created_at)
);

-- AI Moderation Results Table
CREATE TABLE IF NOT EXISTS ai_moderation_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    content_id INT NULL COMMENT 'ID of moderated content',
    content_type VARCHAR(50) NOT NULL COMMENT 'Type of content (comment, interview, etc.)',
    content_hash VARCHAR(64) NOT NULL,
    flagged BOOLEAN DEFAULT FALSE,
    categories JSON COMMENT 'Flagged categories',
    category_scores JSON COMMENT 'Confidence scores for each category',
    action_required VARCHAR(20) DEFAULT 'none' COMMENT 'none, warn, review, block',
    confidence DECIMAL(3,2) DEFAULT 0.00,
    human_reviewed BOOLEAN DEFAULT FALSE,
    human_decision VARCHAR(20) NULL COMMENT 'approve, reject, escalate',
    reviewer_id INT NULL,
    reviewed_at TIMESTAMP NULL,
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_content_hash (content_hash),
    INDEX idx_flagged (flagged),
    INDEX idx_action_required (action_required),
    INDEX idx_human_reviewed (human_reviewed),
    INDEX idx_created_at (created_at)
);

-- AI Sentiment Analysis Table
CREATE TABLE IF NOT EXISTS ai_sentiment_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    content_id INT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    sentiment VARCHAR(20) NOT NULL COMMENT 'positive, negative, neutral',
    confidence DECIMAL(3,2) DEFAULT 0.00,
    emotions JSON COMMENT 'Detected emotions and scores',
    polarity_score DECIMAL(4,3) DEFAULT 0.000 COMMENT '-1.0 to 1.0',
    subjectivity_score DECIMAL(4,3) DEFAULT 0.000 COMMENT '0.0 to 1.0',
    model_used VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_content_hash (content_hash),
    INDEX idx_sentiment (sentiment),
    INDEX idx_created_at (created_at)
);

-- AI Auto Tags Table
CREATE TABLE IF NOT EXISTS ai_auto_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    content_id INT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    generated_tags JSON NOT NULL COMMENT 'AI-generated tags',
    approved_tags JSON COMMENT 'User-approved tags',
    rejected_tags JSON COMMENT 'User-rejected tags',
    confidence_scores JSON COMMENT 'Confidence for each tag',
    model_used VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    auto_applied BOOLEAN DEFAULT FALSE,
    user_reviewed BOOLEAN DEFAULT FALSE,
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_content_hash (content_hash),
    INDEX idx_auto_applied (auto_applied),
    INDEX idx_user_reviewed (user_reviewed),
    INDEX idx_created_at (created_at)
);

-- AI Content Enhancements Table
CREATE TABLE IF NOT EXISTS ai_content_enhancements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    content_id INT NULL,
    content_type VARCHAR(50) NOT NULL,
    original_content_hash VARCHAR(64) NOT NULL,
    enhanced_content_hash VARCHAR(64) NOT NULL,
    enhancement_type VARCHAR(20) NOT NULL COMMENT 'improve, summarize, expand, simplify',
    original_content LONGTEXT NOT NULL,
    enhanced_content LONGTEXT NOT NULL,
    improvement_score DECIMAL(3,2) DEFAULT 0.00,
    model_used VARCHAR(50) DEFAULT 'gpt-4',
    accepted BOOLEAN DEFAULT FALSE,
    feedback_rating INT NULL COMMENT '1-5 rating',
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_enhancement_type (enhancement_type),
    INDEX idx_accepted (accepted),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_original_content (original_content),
    FULLTEXT idx_enhanced_content (enhanced_content)
);

-- AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    feature_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'success, error, timeout',
    processing_time DECIMAL(8,3) DEFAULT 0.000,
    tokens_used INT DEFAULT 0,
    cost_estimate DECIMAL(10,6) DEFAULT 0.000000,
    error_message TEXT,
    request_data JSON COMMENT 'Request parameters (anonymized)',
    response_data JSON COMMENT 'Response metadata',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_feature_name (feature_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_processing_time (processing_time)
);

-- AI Model Performance Table
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(50) NOT NULL,
    feature_name VARCHAR(50) NOT NULL,
    avg_processing_time DECIMAL(8,3) DEFAULT 0.000,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_confidence DECIMAL(3,2) DEFAULT 0.00,
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_model_feature (model_name, feature_name),
    INDEX idx_model_name (model_name),
    INDEX idx_feature_name (feature_name),
    INDEX idx_success_rate (success_rate)
);

-- Insert default AI feature settings
INSERT IGNORE INTO ai_feature_settings (feature_name, is_enabled, settings) VALUES
('transcription', TRUE, JSON_OBJECT(
    'model', 'whisper-1',
    'language', 'auto',
    'confidenceThreshold', 0.8,
    'maxFileSize', 26214400
)),
('contentSuggestions', TRUE, JSON_OBJECT(
    'model', 'gpt-4',
    'includeQuestions', true,
    'includeTopics', true,
    'includeInsights', true,
    'maxSuggestions', 10
)),
('aiModeration', TRUE, JSON_OBJECT(
    'level', 'medium',
    'autoActionThreshold', 0.7,
    'categories', JSON_OBJECT(
        'hate', true,
        'harassment', true,
        'violence', true,
        'spam', true
    )
)),
('sentimentAnalysis', TRUE, JSON_OBJECT(
    'depth', 'detailed',
    'realTime', false,
    'model', 'gpt-3.5-turbo'
)),
('autoTagging', TRUE, JSON_OBJECT(
    'maxTags', 10,
    'includeTopics', true,
    'includeIndustries', true,
    'includeSkills', true,
    'autoApply', false
)),
('contentEnhancement', FALSE, JSON_OBJECT(
    'model', 'gpt-4',
    'improve', true,
    'summarize', true,
    'expand', false,
    'simplify', true
));

-- Create views for analytics

-- AI Usage Summary View
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT 
    feature_name,
    COUNT(*) as total_requests,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_requests,
    ROUND(AVG(processing_time), 3) as avg_processing_time,
    ROUND(SUM(cost_estimate), 6) as total_cost,
    DATE(created_at) as usage_date
FROM ai_usage_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY feature_name, DATE(created_at)
ORDER BY usage_date DESC, total_requests DESC;

-- AI Feature Performance View
CREATE OR REPLACE VIEW ai_feature_performance AS
SELECT 
    afs.feature_name,
    afs.is_enabled,
    COALESCE(usage_stats.total_requests, 0) as total_requests,
    COALESCE(usage_stats.success_rate, 0) as success_rate,
    COALESCE(usage_stats.avg_processing_time, 0) as avg_processing_time,
    COALESCE(usage_stats.total_cost, 0) as total_cost
FROM ai_feature_settings afs
LEFT JOIN (
    SELECT 
        feature_name,
        COUNT(*) as total_requests,
        ROUND((SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as success_rate,
        ROUND(AVG(processing_time), 3) as avg_processing_time,
        ROUND(SUM(cost_estimate), 6) as total_cost
    FROM ai_usage_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY feature_name
) usage_stats ON afs.feature_name = usage_stats.feature_name;

-- User AI Usage View
CREATE OR REPLACE VIEW user_ai_usage AS
SELECT 
    u.id as user_id,
    u.name,
    u.subscription_type,
    COUNT(DISTINCT aul.feature_name) as features_used,
    COUNT(aul.id) as total_requests,
    SUM(CASE WHEN aul.status = 'success' THEN 1 ELSE 0 END) as successful_requests,
    ROUND(SUM(aul.cost_estimate), 6) as total_cost,
    MAX(aul.created_at) as last_used
FROM users u
LEFT JOIN ai_usage_logs aul ON u.id = aul.user_id
WHERE aul.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR aul.id IS NULL
GROUP BY u.id
ORDER BY total_requests DESC;

-- Create stored procedures for AI operations

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetAIFeatureStats(IN p_feature_name VARCHAR(50), IN p_days INT DEFAULT 30)
BEGIN
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_requests,
        ROUND(AVG(processing_time), 3) as avg_processing_time,
        ROUND(SUM(cost_estimate), 6) as daily_cost
    FROM ai_usage_logs
    WHERE feature_name = p_feature_name
    AND created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END//

CREATE PROCEDURE IF NOT EXISTS GetUserAIUsage(IN p_user_id INT, IN p_days INT DEFAULT 30)
BEGIN
    SELECT 
        feature_name,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        ROUND(AVG(processing_time), 3) as avg_time,
        ROUND(SUM(cost_estimate), 6) as cost
    FROM ai_usage_logs
    WHERE user_id = p_user_id
    AND created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    GROUP BY feature_name
    ORDER BY requests DESC;
END//

CREATE PROCEDURE IF NOT EXISTS UpdateModelPerformance()
BEGIN
    INSERT INTO ai_model_performance (
        model_name, feature_name, avg_processing_time, success_rate, 
        total_requests, successful_requests, failed_requests
    )
    SELECT 
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(request_data, '$.model')), 'unknown') as model_name,
        feature_name,
        AVG(processing_time) as avg_processing_time,
        (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_requests
    FROM ai_usage_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    GROUP BY model_name, feature_name
    ON DUPLICATE KEY UPDATE
        avg_processing_time = VALUES(avg_processing_time),
        success_rate = VALUES(success_rate),
        total_requests = ai_model_performance.total_requests + VALUES(total_requests),
        successful_requests = ai_model_performance.successful_requests + VALUES(successful_requests),
        failed_requests = ai_model_performance.failed_requests + VALUES(failed_requests);
END//

DELIMITER ;

-- Create triggers for automatic logging

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_transcription_insert
AFTER INSERT ON ai_transcriptions
FOR EACH ROW
BEGIN
    INSERT INTO ai_usage_logs (user_id, feature_name, status, processing_time)
    VALUES (NEW.user_id, 'transcription', NEW.status, NEW.processing_time);
END//

CREATE TRIGGER IF NOT EXISTS after_content_suggestion_insert
AFTER INSERT ON ai_content_suggestions
FOR EACH ROW
BEGIN
    INSERT INTO ai_usage_logs (user_id, feature_name, status, processing_time)
    VALUES (NEW.user_id, 'contentSuggestions', 'success', NEW.processing_time);
END//

CREATE TRIGGER IF NOT EXISTS after_moderation_result_insert
AFTER INSERT ON ai_moderation_results
FOR EACH ROW
BEGIN
    INSERT INTO ai_usage_logs (user_id, feature_name, status, processing_time)
    VALUES (NEW.user_id, 'aiModeration', 'success', NEW.processing_time);
END//

DELIMITER ;

-- Add AI-related columns to existing tables if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ai_features_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ai_usage_limit INT DEFAULT 1000 COMMENT 'Monthly AI requests limit',
ADD COLUMN IF NOT EXISTS ai_usage_count INT DEFAULT 0 COMMENT 'Current month usage';

ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS ai_transcription_id VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS ai_tags JSON COMMENT 'AI-generated tags',
ADD COLUMN IF NOT EXISTS ai_sentiment JSON COMMENT 'AI sentiment analysis results',
ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT FALSE;

ALTER TABLE comments
ADD COLUMN IF NOT EXISTS ai_moderation_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS ai_sentiment_score DECIMAL(4,3) DEFAULT 0.000;

-- Add foreign key constraints for new columns
ALTER TABLE interviews
ADD CONSTRAINT fk_interviews_ai_transcription 
FOREIGN KEY (ai_transcription_id) REFERENCES ai_transcriptions(id) ON DELETE SET NULL;

ALTER TABLE comments
ADD CONSTRAINT fk_comments_ai_moderation 
FOREIGN KEY (ai_moderation_id) REFERENCES ai_moderation_results(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_ai_enabled ON users(ai_features_enabled);
CREATE INDEX IF NOT EXISTS idx_users_ai_usage ON users(ai_usage_count);
CREATE INDEX IF NOT EXISTS idx_interviews_ai_enhanced ON interviews(ai_enhanced);
CREATE INDEX IF NOT EXISTS idx_comments_ai_sentiment ON comments(ai_sentiment_score);
