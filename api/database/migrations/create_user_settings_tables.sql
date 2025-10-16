-- User Settings Tables for Interviews.tv
-- This migration creates tables to store user preferences and settings

-- User Privacy Settings Table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    profile_visibility ENUM('public', 'private') DEFAULT 'public',
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_downloads BOOLEAN DEFAULT FALSE,
    show_in_search BOOLEAN DEFAULT TRUE,
    allow_messages BOOLEAN DEFAULT TRUE,
    allow_interview_requests BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_privacy (user_id)
);

-- User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email_new_followers BOOLEAN DEFAULT TRUE,
    email_new_comments BOOLEAN DEFAULT TRUE,
    email_interview_requests BOOLEAN DEFAULT TRUE,
    email_weekly_digest BOOLEAN DEFAULT TRUE,
    push_new_followers BOOLEAN DEFAULT FALSE,
    push_new_comments BOOLEAN DEFAULT FALSE,
    push_interview_requests BOOLEAN DEFAULT FALSE,
    in_app_all BOOLEAN DEFAULT TRUE,
    in_app_sound BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_notifications (user_id)
);

-- User Account Settings Table (for password changes, etc.)
CREATE TABLE IF NOT EXISTS user_account_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    login_notifications BOOLEAN DEFAULT TRUE,
    session_timeout INT DEFAULT 30, -- in days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_account (user_id)
);

-- Insert default settings for existing users
INSERT IGNORE INTO user_privacy_settings (user_id)
SELECT id FROM users;

INSERT IGNORE INTO user_notification_settings (user_id)
SELECT id FROM users;

INSERT IGNORE INTO user_account_settings (user_id)
SELECT id FROM users;
