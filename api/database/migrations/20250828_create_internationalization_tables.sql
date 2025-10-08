-- Internationalization Tables Migration
-- Created: 2025-08-28
-- Description: Database schema for multi-language support and translation management

-- Translations Table
CREATE TABLE IF NOT EXISTS translations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    translation_key VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    value TEXT,
    description TEXT COMMENT 'Context or description for translators',
    is_html BOOLEAN DEFAULT FALSE COMMENT 'Whether the translation contains HTML',
    is_plural BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a plural form',
    plural_form ENUM('zero', 'one', 'two', 'few', 'many', 'other') DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_translation_key (translation_key),
    INDEX idx_locale (locale),
    INDEX idx_namespace (namespace),
    INDEX idx_is_plural (is_plural),
    INDEX idx_plural_form (plural_form),
    INDEX idx_updated_at (updated_at),
    UNIQUE KEY unique_translation (translation_key, locale, namespace, plural_form)
);

-- Missing Translations Log Table
CREATE TABLE IF NOT EXISTS missing_translations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    translation_key VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    occurrence_count INT DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    
    INDEX idx_translation_key (translation_key),
    INDEX idx_locale (locale),
    INDEX idx_namespace (namespace),
    INDEX idx_occurrence_count (occurrence_count),
    INDEX idx_is_resolved (is_resolved),
    INDEX idx_last_seen (last_seen),
    UNIQUE KEY unique_missing_translation (translation_key, locale, namespace)
);

-- Locales Configuration Table
CREATE TABLE IF NOT EXISTS locales (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10),
    is_rtl BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    date_format VARCHAR(50) DEFAULT 'Y-m-d',
    time_format VARCHAR(50) DEFAULT 'H:i:s',
    number_format JSON COMMENT 'Number formatting rules',
    currency_format JSON COMMENT 'Currency formatting rules',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_is_rtl (is_rtl)
);

-- Translation Namespaces Table
CREATE TABLE IF NOT EXISTS translation_namespaces (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a system namespace',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_namespace_name (name),
    INDEX idx_is_system (is_system)
);

-- Translation Import/Export Jobs Table
CREATE TABLE IF NOT EXISTS translation_jobs (
    id VARCHAR(50) PRIMARY KEY,
    type ENUM('import', 'export') NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100),
    format ENUM('json', 'csv', 'xlsx', 'po', 'xliff') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    total_keys INT DEFAULT 0,
    processed_keys INT DEFAULT 0,
    imported_keys INT DEFAULT 0,
    updated_keys INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_type (type),
    INDEX idx_locale (locale),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- User Locale Preferences Table
CREATE TABLE IF NOT EXISTS user_locale_preferences (
    user_id INT PRIMARY KEY,
    preferred_locale VARCHAR(10) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(50),
    time_format VARCHAR(50),
    number_format VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'USD',
    auto_detect_locale BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_locale) REFERENCES locales(code) ON DELETE RESTRICT,
    INDEX idx_preferred_locale (preferred_locale),
    INDEX idx_timezone (timezone)
);

-- Translation Statistics Table
CREATE TABLE IF NOT EXISTS translation_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    date DATE NOT NULL,
    total_keys INT DEFAULT 0,
    translated_keys INT DEFAULT 0,
    missing_keys INT DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    new_keys_added INT DEFAULT 0,
    keys_updated INT DEFAULT 0,
    keys_deleted INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (locale) REFERENCES locales(code) ON DELETE CASCADE,
    INDEX idx_locale (locale),
    INDEX idx_namespace (namespace),
    INDEX idx_date (date),
    INDEX idx_completion_percentage (completion_percentage),
    UNIQUE KEY unique_daily_stats (locale, namespace, date)
);

-- Translation Comments/Notes Table
CREATE TABLE IF NOT EXISTS translation_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    translation_key VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    comment TEXT NOT NULL,
    comment_type ENUM('note', 'context', 'issue', 'suggestion') DEFAULT 'note',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES locales(code) ON DELETE CASCADE,
    INDEX idx_translation_key (translation_key),
    INDEX idx_locale (locale),
    INDEX idx_namespace (namespace),
    INDEX idx_comment_type (comment_type),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- Insert default locales
INSERT IGNORE INTO locales (code, name, native_name, flag_emoji, is_rtl, is_active, sort_order, number_format, currency_format) VALUES
('en', 'English', 'English', '🇺🇸', FALSE, TRUE, 1, 
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 2),
 JSON_OBJECT('symbol', '$', 'position', 'before', 'space', FALSE)),
('es', 'Spanish', 'Español', '🇪🇸', FALSE, TRUE, 2,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', '.', 'decimal_places', 2),
 JSON_OBJECT('symbol', '€', 'position', 'after', 'space', TRUE)),
('fr', 'French', 'Français', '🇫🇷', FALSE, TRUE, 3,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', ' ', 'decimal_places', 2),
 JSON_OBJECT('symbol', '€', 'position', 'after', 'space', TRUE)),
('de', 'German', 'Deutsch', '🇩🇪', FALSE, TRUE, 4,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', '.', 'decimal_places', 2),
 JSON_OBJECT('symbol', '€', 'position', 'after', 'space', TRUE)),
('it', 'Italian', 'Italiano', '🇮🇹', FALSE, TRUE, 5,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', '.', 'decimal_places', 2),
 JSON_OBJECT('symbol', '€', 'position', 'after', 'space', TRUE)),
('pt', 'Portuguese', 'Português', '🇵🇹', FALSE, TRUE, 6,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', '.', 'decimal_places', 2),
 JSON_OBJECT('symbol', '€', 'position', 'after', 'space', TRUE)),
('ru', 'Russian', 'Русский', '🇷🇺', FALSE, TRUE, 7,
 JSON_OBJECT('decimal_separator', ',', 'thousands_separator', ' ', 'decimal_places', 2),
 JSON_OBJECT('symbol', '₽', 'position', 'after', 'space', TRUE)),
('zh', 'Chinese', '中文', '🇨🇳', FALSE, TRUE, 8,
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 2),
 JSON_OBJECT('symbol', '¥', 'position', 'before', 'space', FALSE)),
('ja', 'Japanese', '日本語', '🇯🇵', FALSE, TRUE, 9,
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 0),
 JSON_OBJECT('symbol', '¥', 'position', 'before', 'space', FALSE)),
('ko', 'Korean', '한국어', '🇰🇷', FALSE, TRUE, 10,
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 0),
 JSON_OBJECT('symbol', '₩', 'position', 'before', 'space', FALSE)),
('ar', 'Arabic', 'العربية', '🇸🇦', TRUE, TRUE, 11,
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 2),
 JSON_OBJECT('symbol', 'ر.س', 'position', 'after', 'space', TRUE)),
('he', 'Hebrew', 'עברית', '🇮🇱', TRUE, TRUE, 12,
 JSON_OBJECT('decimal_separator', '.', 'thousands_separator', ',', 'decimal_places', 2),
 JSON_OBJECT('symbol', '₪', 'position', 'before', 'space', TRUE));

-- Insert default namespaces
INSERT IGNORE INTO translation_namespaces (name, description, is_system) VALUES
('default', 'Default namespace for general translations', TRUE),
('common', 'Common UI elements and messages', TRUE),
('auth', 'Authentication and authorization messages', TRUE),
('validation', 'Form validation messages', TRUE),
('errors', 'Error messages and codes', TRUE),
('emails', 'Email templates and content', TRUE),
('notifications', 'Push notifications and alerts', TRUE),
('interviews', 'Interview-related content', FALSE),
('business', 'Business directory content', FALSE),
('admin', 'Admin panel interface', TRUE);

-- Insert sample English translations
INSERT IGNORE INTO translations (translation_key, locale, namespace, value, description) VALUES
-- Common translations
('common.buttons.save', 'en', 'common', 'Save', 'Save button text'),
('common.buttons.cancel', 'en', 'common', 'Cancel', 'Cancel button text'),
('common.buttons.delete', 'en', 'common', 'Delete', 'Delete button text'),
('common.buttons.edit', 'en', 'common', 'Edit', 'Edit button text'),
('common.buttons.create', 'en', 'common', 'Create', 'Create button text'),
('common.buttons.update', 'en', 'common', 'Update', 'Update button text'),
('common.buttons.submit', 'en', 'common', 'Submit', 'Submit button text'),
('common.buttons.close', 'en', 'common', 'Close', 'Close button text'),
('common.buttons.back', 'en', 'common', 'Back', 'Back button text'),
('common.buttons.next', 'en', 'common', 'Next', 'Next button text'),
('common.buttons.previous', 'en', 'common', 'Previous', 'Previous button text'),
('common.buttons.confirm', 'en', 'common', 'Confirm', 'Confirm button text'),

-- Navigation
('common.nav.home', 'en', 'common', 'Home', 'Home navigation link'),
('common.nav.explore', 'en', 'common', 'Explore', 'Explore navigation link'),
('common.nav.business', 'en', 'common', 'Business', 'Business navigation link'),
('common.nav.profile', 'en', 'common', 'Profile', 'Profile navigation link'),
('common.nav.settings', 'en', 'common', 'Settings', 'Settings navigation link'),
('common.nav.logout', 'en', 'common', 'Logout', 'Logout navigation link'),

-- Authentication
('auth.login.title', 'en', 'auth', 'Sign In', 'Login page title'),
('auth.login.email', 'en', 'auth', 'Email Address', 'Email field label'),
('auth.login.password', 'en', 'auth', 'Password', 'Password field label'),
('auth.login.remember', 'en', 'auth', 'Remember me', 'Remember me checkbox'),
('auth.login.forgot', 'en', 'auth', 'Forgot password?', 'Forgot password link'),
('auth.login.submit', 'en', 'auth', 'Sign In', 'Login submit button'),
('auth.register.title', 'en', 'auth', 'Create Account', 'Registration page title'),
('auth.register.name', 'en', 'auth', 'Full Name', 'Name field label'),
('auth.register.confirm_password', 'en', 'auth', 'Confirm Password', 'Confirm password field'),
('auth.register.submit', 'en', 'auth', 'Create Account', 'Registration submit button'),

-- Validation messages
('validation.required', 'en', 'validation', 'This field is required', 'Required field validation'),
('validation.email', 'en', 'validation', 'Please enter a valid email address', 'Email validation'),
('validation.min_length', 'en', 'validation', 'Must be at least {min} characters', 'Minimum length validation'),
('validation.max_length', 'en', 'validation', 'Must not exceed {max} characters', 'Maximum length validation'),
('validation.password_match', 'en', 'validation', 'Passwords do not match', 'Password confirmation validation'),

-- Error messages
('errors.general', 'en', 'errors', 'An unexpected error occurred', 'General error message'),
('errors.network', 'en', 'errors', 'Network connection error', 'Network error message'),
('errors.unauthorized', 'en', 'errors', 'You are not authorized to perform this action', 'Authorization error'),
('errors.not_found', 'en', 'errors', 'The requested resource was not found', '404 error message'),
('errors.server', 'en', 'errors', 'Internal server error', '500 error message'),

-- Interview-related
('interviews.title', 'en', 'interviews', 'Interviews', 'Interviews section title'),
('interviews.create.title', 'en', 'interviews', 'Create Interview', 'Create interview page title'),
('interviews.edit.title', 'en', 'interviews', 'Edit Interview', 'Edit interview page title'),
('interviews.view.title', 'en', 'interviews', 'View Interview', 'View interview page title'),
('interviews.list.empty', 'en', 'interviews', 'No interviews found', 'Empty interviews list message'),

-- Business directory
('business.title', 'en', 'business', 'Business Directory', 'Business directory title'),
('business.create.title', 'en', 'business', 'Add Business', 'Add business page title'),
('business.edit.title', 'en', 'business', 'Edit Business', 'Edit business page title'),
('business.list.empty', 'en', 'business', 'No businesses found', 'Empty business list message');

-- Create views for translation analytics

-- Translation Completion View
CREATE OR REPLACE VIEW translation_completion_by_locale AS
SELECT 
    l.code as locale,
    l.name as locale_name,
    l.native_name,
    l.flag_emoji,
    COUNT(DISTINCT t.translation_key) as total_keys,
    COUNT(DISTINCT CASE WHEN t.value IS NOT NULL AND t.value != '' THEN t.translation_key END) as completed_keys,
    COUNT(DISTINCT CASE WHEN t.value IS NULL OR t.value = '' THEN t.translation_key END) as missing_keys,
    ROUND(
        (COUNT(DISTINCT CASE WHEN t.value IS NOT NULL AND t.value != '' THEN t.translation_key END) / 
         COUNT(DISTINCT t.translation_key)) * 100, 2
    ) as completion_percentage
FROM locales l
LEFT JOIN translations t ON l.code = t.locale
WHERE l.is_active = TRUE
GROUP BY l.code, l.name, l.native_name, l.flag_emoji
ORDER BY completion_percentage DESC, l.sort_order;

-- Translation Progress by Namespace
CREATE OR REPLACE VIEW translation_progress_by_namespace AS
SELECT 
    t.namespace,
    t.locale,
    COUNT(*) as total_keys,
    COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) as completed_keys,
    COUNT(CASE WHEN t.value IS NULL OR t.value = '' THEN 1 END) as missing_keys,
    ROUND(
        (COUNT(CASE WHEN t.value IS NOT NULL AND t.value != '' THEN 1 END) / COUNT(*)) * 100, 2
    ) as completion_percentage
FROM translations t
GROUP BY t.namespace, t.locale
ORDER BY t.namespace, completion_percentage DESC;

-- Most Missing Translations
CREATE OR REPLACE VIEW most_missing_translations AS
SELECT 
    mt.translation_key,
    mt.namespace,
    COUNT(DISTINCT mt.locale) as missing_in_locales,
    mt.occurrence_count,
    mt.last_seen,
    GROUP_CONCAT(DISTINCT mt.locale ORDER BY mt.locale) as missing_locales
FROM missing_translations mt
WHERE mt.is_resolved = FALSE
GROUP BY mt.translation_key, mt.namespace
ORDER BY missing_in_locales DESC, mt.occurrence_count DESC
LIMIT 100;

-- Create stored procedures for translation management

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetTranslationStats(IN p_locale VARCHAR(10))
BEGIN
    SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) as completed_keys,
        COUNT(CASE WHEN value IS NULL OR value = '' THEN 1 END) as missing_keys,
        ROUND(
            (COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) / COUNT(*)) * 100, 2
        ) as completion_percentage
    FROM translations
    WHERE locale = p_locale;
END//

CREATE PROCEDURE IF NOT EXISTS UpdateTranslationStats()
BEGIN
    INSERT INTO translation_statistics (
        locale, namespace, date, total_keys, translated_keys, missing_keys, completion_percentage
    )
    SELECT 
        locale,
        namespace,
        CURDATE() as date,
        COUNT(*) as total_keys,
        COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) as translated_keys,
        COUNT(CASE WHEN value IS NULL OR value = '' THEN 1 END) as missing_keys,
        ROUND(
            (COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) / COUNT(*)) * 100, 2
        ) as completion_percentage
    FROM translations
    GROUP BY locale, namespace
    ON DUPLICATE KEY UPDATE
        total_keys = VALUES(total_keys),
        translated_keys = VALUES(translated_keys),
        missing_keys = VALUES(missing_keys),
        completion_percentage = VALUES(completion_percentage);
END//

CREATE PROCEDURE IF NOT EXISTS CleanupOldTranslationStats(IN p_days INT DEFAULT 90)
BEGIN
    DELETE FROM translation_statistics 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL p_days DAY);
END//

DELIMITER ;

-- Create triggers for automatic statistics updates

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_translation_insert
AFTER INSERT ON translations
FOR EACH ROW
BEGIN
    -- Update daily statistics
    INSERT INTO translation_statistics (
        locale, namespace, date, total_keys, translated_keys, missing_keys, completion_percentage
    )
    SELECT 
        NEW.locale,
        NEW.namespace,
        CURDATE(),
        COUNT(*),
        COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END),
        COUNT(CASE WHEN value IS NULL OR value = '' THEN 1 END),
        ROUND((COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) / COUNT(*)) * 100, 2)
    FROM translations
    WHERE locale = NEW.locale AND namespace = NEW.namespace
    ON DUPLICATE KEY UPDATE
        total_keys = VALUES(total_keys),
        translated_keys = VALUES(translated_keys),
        missing_keys = VALUES(missing_keys),
        completion_percentage = VALUES(completion_percentage);
END//

CREATE TRIGGER IF NOT EXISTS after_translation_update
AFTER UPDATE ON translations
FOR EACH ROW
BEGIN
    -- Update daily statistics
    INSERT INTO translation_statistics (
        locale, namespace, date, total_keys, translated_keys, missing_keys, completion_percentage
    )
    SELECT 
        NEW.locale,
        NEW.namespace,
        CURDATE(),
        COUNT(*),
        COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END),
        COUNT(CASE WHEN value IS NULL OR value = '' THEN 1 END),
        ROUND((COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) / COUNT(*)) * 100, 2)
    FROM translations
    WHERE locale = NEW.locale AND namespace = NEW.namespace
    ON DUPLICATE KEY UPDATE
        total_keys = VALUES(total_keys),
        translated_keys = VALUES(translated_keys),
        missing_keys = VALUES(missing_keys),
        completion_percentage = VALUES(completion_percentage);
END//

DELIMITER ;

-- Add i18n-related columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_preferred_locale ON users(preferred_locale);
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
