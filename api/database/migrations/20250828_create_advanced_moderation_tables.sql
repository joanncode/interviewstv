-- Advanced Moderation Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for comprehensive content moderation and safety management

-- Moderation Logs Table
CREATE TABLE IF NOT EXISTS moderation_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_id VARCHAR(50) NOT NULL,
    content_type ENUM('interview', 'comment', 'business', 'message', 'profile', 'image') NOT NULL,
    user_id INT NOT NULL,
    status ENUM('approved', 'rejected', 'flagged', 'quarantined', 'pending_review') NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.00 COMMENT 'AI confidence score 0.00-1.00',
    flags JSON COMMENT 'Array of moderation flags',
    actions JSON COMMENT 'Array of actions taken',
    moderation_data JSON COMMENT 'Complete moderation analysis data',
    moderator_id INT NULL COMMENT 'Human moderator who reviewed',
    review_reason TEXT COMMENT 'Reason for manual review decision',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_moderator_id (moderator_id),
    INDEX idx_created_at (created_at),
    INDEX idx_reviewed_at (reviewed_at)
);

-- Moderation Queue Table
CREATE TABLE IF NOT EXISTS moderation_queue (
    id VARCHAR(50) PRIMARY KEY,
    content_id VARCHAR(50) NOT NULL,
    content_type ENUM('interview', 'comment', 'business', 'message', 'profile', 'image') NOT NULL,
    user_id INT NOT NULL,
    priority TINYINT DEFAULT 3 COMMENT '1=High, 2=Medium, 3=Normal',
    status ENUM('pending', 'in_review', 'reviewed', 'escalated') DEFAULT 'pending',
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    flags JSON COMMENT 'Array of moderation flags',
    moderation_data JSON COMMENT 'Complete moderation analysis data',
    assigned_to INT NULL COMMENT 'Moderator assigned to review',
    action_taken ENUM('approve', 'reject', 'quarantine', 'escalate') NULL,
    reason TEXT COMMENT 'Reason for action taken',
    reviewed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_user_id (user_id),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_reviewed_by (reviewed_by),
    INDEX idx_created_at (created_at)
);

-- User Moderation Profiles Table
CREATE TABLE IF NOT EXISTS user_moderation_profiles (
    user_id INT PRIMARY KEY,
    reputation_score INT DEFAULT 50 COMMENT 'User reputation score 0-100',
    total_violations INT DEFAULT 0,
    recent_violations INT DEFAULT 0 COMMENT 'Violations in last 30 days',
    account_age_days INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_trusted BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    warning_count INT DEFAULT 0,
    suspension_count INT DEFAULT 0,
    last_violation_at TIMESTAMP NULL,
    last_warning_at TIMESTAMP NULL,
    last_suspension_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reputation_score (reputation_score),
    INDEX idx_total_violations (total_violations),
    INDEX idx_recent_violations (recent_violations),
    INDEX idx_is_verified (is_verified),
    INDEX idx_is_trusted (is_trusted),
    INDEX idx_is_flagged (is_flagged),
    INDEX idx_last_violation_at (last_violation_at)
);

-- Moderation Keywords Table
CREATE TABLE IF NOT EXISTS moderation_keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL COMMENT 'e.g., hate_speech, spam, profanity',
    severity TINYINT NOT NULL COMMENT '1-10 severity level',
    keywords JSON NOT NULL COMMENT 'Array of keywords/phrases',
    is_active BOOLEAN DEFAULT TRUE,
    is_regex BOOLEAN DEFAULT FALSE COMMENT 'Whether keywords are regex patterns',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_severity (severity),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Content Fingerprints Table (for duplicate detection)
CREATE TABLE IF NOT EXISTS content_fingerprints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_id VARCHAR(50) NOT NULL,
    content_type ENUM('interview', 'comment', 'business', 'message') NOT NULL,
    content_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of content',
    word_hash VARCHAR(64) NOT NULL COMMENT 'Hash of first 10 words',
    similarity_score DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_content_hash (content_hash),
    INDEX idx_word_hash (word_hash),
    UNIQUE KEY unique_content_fingerprint (content_id, content_type)
);

-- Malicious Domains Table
CREATE TABLE IF NOT EXISTS malicious_domains (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    risk_level TINYINT NOT NULL COMMENT '1-10 risk level',
    category VARCHAR(100) COMMENT 'e.g., malware, phishing, spam',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    reported_by INT NULL,
    verified_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_domain (domain),
    INDEX idx_risk_level (risk_level),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_domain (domain)
);

-- User Reports Table
CREATE TABLE IF NOT EXISTS user_reports (
    id VARCHAR(50) PRIMARY KEY,
    content_id VARCHAR(50) NOT NULL,
    content_type ENUM('interview', 'comment', 'business', 'message', 'user', 'profile') NOT NULL,
    reported_user_id INT NOT NULL COMMENT 'User being reported',
    reporter_user_id INT NOT NULL COMMENT 'User making the report',
    report_type ENUM('spam', 'harassment', 'hate_speech', 'inappropriate', 'copyright', 'other') NOT NULL,
    description TEXT,
    status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
    priority TINYINT DEFAULT 3 COMMENT '1=High, 2=Medium, 3=Normal',
    assigned_to INT NULL,
    resolution TEXT,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_reported_user_id (reported_user_id),
    INDEX idx_reporter_user_id (reporter_user_id),
    INDEX idx_report_type (report_type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_at (created_at)
);

-- Moderation Actions Table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    moderator_id INT NOT NULL,
    action_type ENUM('approve', 'reject', 'quarantine', 'escalate', 'warn', 'suspend', 'ban') NOT NULL,
    target_type ENUM('content', 'user', 'report') NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    reason TEXT,
    duration_hours INT NULL COMMENT 'For suspensions/bans',
    metadata JSON COMMENT 'Additional action metadata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_moderator_id (moderator_id),
    INDEX idx_action_type (action_type),
    INDEX idx_target_type (target_type),
    INDEX idx_target_id (target_id),
    INDEX idx_created_at (created_at)
);

-- Moderation Settings Table
CREATE TABLE IF NOT EXISTS moderation_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON NOT NULL,
    description TEXT,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_setting_key (setting_key),
    INDEX idx_updated_by (updated_by),
    UNIQUE KEY unique_setting_key (setting_key)
);

-- Moderation Statistics Table
CREATE TABLE IF NOT EXISTS moderation_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    content_type ENUM('interview', 'comment', 'business', 'message', 'all') DEFAULT 'all',
    total_processed INT DEFAULT 0,
    auto_approved INT DEFAULT 0,
    auto_rejected INT DEFAULT 0,
    flagged_for_review INT DEFAULT 0,
    manually_reviewed INT DEFAULT 0,
    user_reports INT DEFAULT 0,
    false_positives INT DEFAULT 0,
    false_negatives INT DEFAULT 0,
    avg_processing_time DECIMAL(8,3) DEFAULT 0.000 COMMENT 'Average processing time in seconds',
    ai_accuracy_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'AI accuracy percentage',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_date (date),
    INDEX idx_content_type (content_type),
    UNIQUE KEY unique_daily_stats (date, content_type)
);

-- Escalation Rules Table
CREATE TABLE IF NOT EXISTS escalation_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    conditions JSON NOT NULL COMMENT 'Conditions that trigger escalation',
    escalation_type ENUM('senior_moderator', 'admin', 'legal_team') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority TINYINT DEFAULT 3,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rule_name (rule_name),
    INDEX idx_escalation_type (escalation_type),
    INDEX idx_is_active (is_active),
    INDEX idx_priority (priority)
);

-- Insert default moderation keywords
INSERT IGNORE INTO moderation_keywords (category, severity, keywords, created_by) VALUES
('hate_speech', 9, JSON_ARRAY('hate', 'nazi', 'terrorist', 'kill yourself', 'die'), 1),
('profanity', 5, JSON_ARRAY('fuck', 'shit', 'damn', 'bitch', 'asshole'), 1),
('spam', 7, JSON_ARRAY('buy now', 'click here', 'free money', 'get rich quick', 'limited time'), 1),
('harassment', 8, JSON_ARRAY('stalker', 'creep', 'loser', 'ugly', 'stupid'), 1),
('adult_content', 8, JSON_ARRAY('porn', 'xxx', 'sex', 'nude', 'naked'), 1),
('violence', 9, JSON_ARRAY('murder', 'kill', 'bomb', 'weapon', 'violence'), 1);

-- Insert default malicious domains
INSERT IGNORE INTO malicious_domains (domain, risk_level, category, description, reported_by) VALUES
('malware-site.com', 10, 'malware', 'Known malware distribution site', 1),
('phishing-bank.com', 9, 'phishing', 'Fake banking site for credential theft', 1),
('spam-links.net', 7, 'spam', 'Known spam link farm', 1),
('scam-offers.org', 8, 'scam', 'Fraudulent offers and scams', 1);

-- Insert default moderation settings
INSERT IGNORE INTO moderation_settings (setting_key, setting_value, description, updated_by) VALUES
('auto_moderation_enabled', 'true', 'Enable automatic content moderation', 1),
('ai_moderation_enabled', 'true', 'Enable AI-powered moderation', 1),
('toxicity_threshold', '0.7', 'Threshold for toxicity detection', 1),
('spam_threshold', '0.8', 'Threshold for spam detection', 1),
('hate_speech_threshold', '0.6', 'Threshold for hate speech detection', 1),
('auto_action_threshold', '0.9', 'Threshold for automatic actions', 1),
('quarantine_threshold', '0.7', 'Threshold for content quarantine', 1),
('review_queue_enabled', 'true', 'Enable moderation review queue', 1),
('escalation_enabled', 'true', 'Enable automatic escalation', 1),
('community_reporting_enabled', 'true', 'Enable community reporting', 1);

-- Insert default escalation rules
INSERT IGNORE INTO escalation_rules (rule_name, conditions, escalation_type, created_by) VALUES
('High Confidence Threats', JSON_OBJECT('confidence', 0.95, 'flags', JSON_ARRAY('threat', 'violence')), 'admin', 1),
('Multiple Reports Same Content', JSON_OBJECT('report_count', 5, 'time_window', 3600), 'senior_moderator', 1),
('Verified User Violations', JSON_OBJECT('user_verified', true, 'violation_severity', 8), 'admin', 1),
('Legal Content Issues', JSON_OBJECT('flags', JSON_ARRAY('copyright', 'legal_threat')), 'legal_team', 1);

-- Create views for moderation analytics

-- Moderation Overview View
CREATE OR REPLACE VIEW moderation_overview AS
SELECT 
    DATE(created_at) as date,
    content_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN status = 'flagged' THEN 1 END) as flagged_count,
    COUNT(CASE WHEN status = 'quarantined' THEN 1 END) as quarantined_count,
    COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_count,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN moderator_id IS NOT NULL THEN 1 END) as manually_reviewed
FROM moderation_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), content_type
ORDER BY date DESC, content_type;

-- Moderator Performance View
CREATE OR REPLACE VIEW moderator_performance AS
SELECT 
    u.id as moderator_id,
    u.name as moderator_name,
    COUNT(ml.id) as total_reviews,
    COUNT(CASE WHEN ml.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN ml.status = 'rejected' THEN 1 END) as rejected_count,
    AVG(TIMESTAMPDIFF(MINUTE, ml.created_at, ml.reviewed_at)) as avg_review_time_minutes,
    COUNT(CASE WHEN DATE(ml.reviewed_at) = CURDATE() THEN 1 END) as reviews_today,
    COUNT(CASE WHEN ml.reviewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as reviews_this_week
FROM users u
JOIN moderation_logs ml ON u.id = ml.moderator_id
WHERE ml.reviewed_at IS NOT NULL
AND ml.reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.name
ORDER BY total_reviews DESC;

-- User Risk Assessment View
CREATE OR REPLACE VIEW user_risk_assessment AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    ump.reputation_score,
    ump.total_violations,
    ump.recent_violations,
    ump.account_age_days,
    ump.is_flagged,
    COUNT(ml.id) as total_moderated_content,
    COUNT(CASE WHEN ml.status = 'rejected' THEN 1 END) as rejected_content,
    COUNT(ur.id) as times_reported,
    CASE 
        WHEN ump.recent_violations > 5 OR ump.reputation_score < 20 THEN 'High Risk'
        WHEN ump.recent_violations > 2 OR ump.reputation_score < 40 THEN 'Medium Risk'
        ELSE 'Low Risk'
    END as risk_level
FROM users u
LEFT JOIN user_moderation_profiles ump ON u.id = ump.user_id
LEFT JOIN moderation_logs ml ON u.id = ml.user_id AND ml.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN user_reports ur ON u.id = ur.reported_user_id AND ur.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.name, u.email, ump.reputation_score, ump.total_violations, ump.recent_violations, ump.account_age_days, ump.is_flagged
HAVING total_moderated_content > 0 OR times_reported > 0
ORDER BY 
    CASE risk_level 
        WHEN 'High Risk' THEN 1 
        WHEN 'Medium Risk' THEN 2 
        ELSE 3 
    END,
    ump.recent_violations DESC;

-- Content Flags Analysis View
CREATE OR REPLACE VIEW content_flags_analysis AS
SELECT 
    flag_name,
    content_type,
    COUNT(*) as flag_count,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_with_flag,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_with_flag,
    ROUND((COUNT(CASE WHEN status = 'rejected' THEN 1 END) / COUNT(*)) * 100, 2) as rejection_rate
FROM (
    SELECT 
        ml.*,
        JSON_UNQUOTE(JSON_EXTRACT(flag_data.flag, '$')) as flag_name
    FROM moderation_logs ml
    CROSS JOIN JSON_TABLE(ml.flags, '$[*]' COLUMNS (flag JSON PATH '$')) as flag_data
    WHERE ml.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
) as flagged_content
GROUP BY flag_name, content_type
ORDER BY flag_count DESC;

-- Create stored procedures for moderation management

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetModerationStats(IN p_days INT DEFAULT 7)
BEGIN
    SELECT 
        COUNT(*) as total_processed,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as auto_approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as auto_rejected,
        COUNT(CASE WHEN status = 'flagged' OR status = 'pending_review' THEN 1 END) as pending_review,
        COUNT(CASE WHEN moderator_id IS NOT NULL THEN 1 END) as manually_reviewed,
        AVG(confidence_score) as avg_confidence,
        ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) / COUNT(*)) * 100, 2) as approval_rate,
        ROUND((COUNT(CASE WHEN status = 'rejected' THEN 1 END) / COUNT(*)) * 100, 2) as rejection_rate
    FROM moderation_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY);
END//

CREATE PROCEDURE IF NOT EXISTS UpdateUserReputation(IN p_user_id INT, IN p_action VARCHAR(20))
BEGIN
    DECLARE reputation_change INT DEFAULT 0;
    
    CASE p_action
        WHEN 'content_approved' THEN SET reputation_change = 1;
        WHEN 'content_rejected' THEN SET reputation_change = -5;
        WHEN 'reported_valid' THEN SET reputation_change = -10;
        WHEN 'reported_invalid' THEN SET reputation_change = 2;
        WHEN 'warning_issued' THEN SET reputation_change = -15;
        WHEN 'suspension' THEN SET reputation_change = -25;
        ELSE SET reputation_change = 0;
    END CASE;
    
    INSERT INTO user_moderation_profiles (user_id, reputation_score, account_age_days)
    VALUES (p_user_id, 50 + reputation_change, DATEDIFF(NOW(), (SELECT created_at FROM users WHERE id = p_user_id)))
    ON DUPLICATE KEY UPDATE
        reputation_score = GREATEST(0, LEAST(100, reputation_score + reputation_change)),
        updated_at = NOW();
END//

CREATE PROCEDURE IF NOT EXISTS CleanupOldModerationData(IN p_days INT DEFAULT 90)
BEGIN
    -- Archive old moderation logs
    DELETE FROM moderation_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days DAY)
    AND status IN ('approved', 'rejected');
    
    -- Clean up resolved reports older than specified days
    DELETE FROM user_reports 
    WHERE status = 'resolved' 
    AND resolved_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
    
    -- Clean up old statistics
    DELETE FROM moderation_statistics 
    WHERE date < DATE_SUB(CURDATE(), INTERVAL p_days DAY);
END//

DELIMITER ;

-- Create triggers for automatic moderation profile updates

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_moderation_log_insert
AFTER INSERT ON moderation_logs
FOR EACH ROW
BEGIN
    -- Update user moderation profile
    INSERT INTO user_moderation_profiles (user_id, account_age_days)
    VALUES (NEW.user_id, DATEDIFF(NOW(), (SELECT created_at FROM users WHERE id = NEW.user_id)))
    ON DUPLICATE KEY UPDATE
        total_violations = CASE WHEN NEW.status = 'rejected' THEN total_violations + 1 ELSE total_violations END,
        recent_violations = (
            SELECT COUNT(*) FROM moderation_logs 
            WHERE user_id = NEW.user_id 
            AND status = 'rejected' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ),
        last_violation_at = CASE WHEN NEW.status = 'rejected' THEN NOW() ELSE last_violation_at END,
        updated_at = NOW();
        
    -- Create content fingerprint for duplicate detection
    IF NEW.status = 'approved' THEN
        INSERT IGNORE INTO content_fingerprints (content_id, content_type, content_hash, word_hash)
        VALUES (NEW.content_id, NEW.content_type, 
                SHA2(CONCAT(NEW.content_id, NEW.content_type), 256),
                SHA2(SUBSTRING(NEW.content_id, 1, 50), 256));
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS after_user_report_insert
AFTER INSERT ON user_reports
FOR EACH ROW
BEGIN
    -- Update reported user's profile
    UPDATE user_moderation_profiles 
    SET is_flagged = TRUE, updated_at = NOW()
    WHERE user_id = NEW.reported_user_id;
    
    -- Auto-escalate if multiple reports for same content
    IF (SELECT COUNT(*) FROM user_reports 
        WHERE content_id = NEW.content_id 
        AND content_type = NEW.content_type 
        AND status = 'pending') >= 3 THEN
        
        UPDATE user_reports 
        SET priority = 1, status = 'investigating'
        WHERE content_id = NEW.content_id 
        AND content_type = NEW.content_type;
    END IF;
END//

DELIMITER ;

-- Add moderation-related columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS moderation_role ENUM('user', 'moderator', 'senior_moderator', 'admin') DEFAULT 'user',
ADD COLUMN IF NOT EXISTS can_moderate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_permissions JSON COMMENT 'Specific moderation permissions';

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS moderation_status ENUM('pending', 'approved', 'rejected', 'quarantined') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS moderation_flags JSON;

ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS moderation_status ENUM('pending', 'approved', 'rejected', 'quarantined') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS moderation_flags JSON;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS moderation_status ENUM('pending', 'approved', 'rejected', 'quarantined') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS moderation_flags JSON;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_moderation_role ON users(moderation_role);
CREATE INDEX IF NOT EXISTS idx_users_can_moderate ON users(can_moderate);
CREATE INDEX IF NOT EXISTS idx_interviews_moderation_status ON interviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_comments_moderation_status ON comments(moderation_status);
CREATE INDEX IF NOT EXISTS idx_businesses_moderation_status ON businesses(moderation_status);
