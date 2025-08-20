-- Notifications tables migration
-- This file creates the necessary tables for the notification system

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    entity_type VARCHAR(50),
    entity_id BIGINT UNSIGNED,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    frequency ENUM('immediate', 'hourly', 'daily', 'weekly', 'never') DEFAULT 'immediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_type (user_id, notification_type)
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    email_subject_template VARCHAR(255),
    email_body_template TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create notification_channels table
CREATE TABLE IF NOT EXISTS notification_channels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    channel_type ENUM('email', 'push', 'sms', 'webhook') NOT NULL,
    channel_address VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    verification_expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notification_deliveries table
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    notification_id BIGINT UNSIGNED NOT NULL,
    channel_type ENUM('in_app', 'email', 'push', 'sms', 'webhook') NOT NULL,
    channel_address VARCHAR(255),
    status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    failure_reason TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP NULL,
    external_id VARCHAR(255),
    response_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

-- Create notification_batches table for bulk notifications
CREATE TABLE IF NOT EXISTS notification_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    notification_type VARCHAR(50) NOT NULL,
    target_criteria JSON,
    template_data JSON,
    status ENUM('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create notification_subscriptions table for topic-based notifications
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    subscription_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT UNSIGNED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subscription (user_id, subscription_type, entity_type, entity_id)
);

-- Create notification_digest table for email digests
CREATE TABLE IF NOT EXISTS notification_digest (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    digest_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    digest_date DATE NOT NULL,
    notification_count INT DEFAULT 0,
    content JSON,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_digest (user_id, digest_type, digest_date)
);

-- Create notification_analytics table
CREATE TABLE IF NOT EXISTS notification_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    notification_id BIGINT UNSIGNED,
    batch_id BIGINT UNSIGNED,
    event_type ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed') NOT NULL,
    channel_type ENUM('in_app', 'email', 'push', 'sms', 'webhook') NOT NULL,
    user_id BIGINT UNSIGNED,
    ip_address VARCHAR(45),
    user_agent TEXT,
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES notification_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default notification templates
INSERT INTO notification_templates (type, name, title_template, message_template, email_subject_template, email_body_template, variables) VALUES
('new_follower', 'New Follower', '{{follower_name}} started following you', '{{follower_name}} is now following you on Interviews.tv', 'You have a new follower on Interviews.tv', 'Hi {{user_name}},\n\n{{follower_name}} started following you on Interviews.tv. Check out their profile and interviews!\n\nView Profile: {{follower_profile_url}}\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "follower_name", "follower_profile_url"]'),

('new_like', 'New Like', 'Someone liked your {{entity_type}}', '{{liker_name}} liked your {{entity_type}} "{{entity_title}}"', 'Your {{entity_type}} received a new like', 'Hi {{user_name}},\n\n{{liker_name}} liked your {{entity_type}} "{{entity_title}}" on Interviews.tv.\n\nView {{entity_type}}: {{entity_url}}\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "liker_name", "entity_type", "entity_title", "entity_url"]'),

('new_comment', 'New Comment', 'New comment on your {{entity_type}}', '{{commenter_name}} commented on your {{entity_type}} "{{entity_title}}"', 'New comment on your {{entity_type}}', 'Hi {{user_name}},\n\n{{commenter_name}} left a comment on your {{entity_type}} "{{entity_title}}":\n\n"{{comment_text}}"\n\nReply to comment: {{entity_url}}\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "commenter_name", "entity_type", "entity_title", "comment_text", "entity_url"]'),

('interview_featured', 'Interview Featured', 'Your interview was featured!', 'Congratulations! Your interview "{{interview_title}}" has been featured on Interviews.tv', 'Your interview has been featured!', 'Hi {{user_name}},\n\nCongratulations! Your interview "{{interview_title}}" has been featured on Interviews.tv. This means it will be highlighted to more users and get increased visibility.\n\nView your featured interview: {{interview_url}}\n\nKeep up the great work!\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "interview_title", "interview_url"]'),

('event_reminder', 'Event Reminder', 'Reminder: {{event_title}} starts soon', 'Don\'t forget! The event "{{event_title}}" you\'re attending starts {{start_time}}', 'Event reminder: {{event_title}}', 'Hi {{user_name}},\n\nThis is a reminder that the event "{{event_title}}" you\'re attending starts {{start_time}}.\n\nEvent Details:\n- Date: {{event_date}}\n- Time: {{event_time}}\n- Location: {{event_location}}\n\nJoin event: {{event_url}}\n\nSee you there!\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "event_title", "start_time", "event_date", "event_time", "event_location", "event_url"]'),

('business_verified', 'Business Verified', 'Your business has been verified!', 'Congratulations! Your business "{{business_name}}" has been verified on Interviews.tv', 'Your business verification is complete', 'Hi {{user_name}},\n\nGreat news! Your business "{{business_name}}" has been successfully verified on Interviews.tv. Your business profile now displays a verification badge, which helps build trust with potential customers.\n\nView your verified business: {{business_url}}\n\nThank you for being part of the Interviews.tv community!\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "business_name", "business_url"]'),

('weekly_digest', 'Weekly Digest', 'Your weekly Interviews.tv digest', 'Here\'s what happened on Interviews.tv this week', 'Your weekly Interviews.tv digest', 'Hi {{user_name}},\n\nHere\'s your weekly digest of activity on Interviews.tv:\n\n{{digest_content}}\n\nStay connected: {{platform_url}}\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "digest_content", "platform_url"]'),

('system_announcement', 'System Announcement', '{{announcement_title}}', '{{announcement_message}}', 'Important announcement from Interviews.tv', 'Hi {{user_name}},\n\n{{announcement_message}}\n\nFor more information, visit: {{more_info_url}}\n\nBest regards,\nThe Interviews.tv Team', '["user_name", "announcement_title", "announcement_message", "more_info_url"]');

-- Insert default notification preferences for common types
INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled, push_enabled, frequency) 
SELECT id, 'new_follower', TRUE, TRUE, TRUE, 'immediate' FROM users WHERE id = 0; -- This will be updated by triggers

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled, push_enabled, frequency) 
SELECT id, 'new_like', TRUE, FALSE, TRUE, 'immediate' FROM users WHERE id = 0; -- This will be updated by triggers

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled, push_enabled, frequency) 
SELECT id, 'new_comment', TRUE, TRUE, TRUE, 'immediate' FROM users WHERE id = 0; -- This will be updated by triggers

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON notification_deliveries(channel_type);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_retry ON notification_deliveries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_entity ON notification_subscriptions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notification_digest_user_date ON notification_digest(user_id, digest_date);
CREATE INDEX IF NOT EXISTS idx_notification_digest_status ON notification_digest(status);

CREATE INDEX IF NOT EXISTS idx_notification_analytics_notification ON notification_analytics(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event ON notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_created ON notification_analytics(created_at);
