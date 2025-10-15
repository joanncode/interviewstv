-- =====================================================
-- Multi-Language Support System Database Schema
-- Task 5.3.5: Add multi-language support
-- =====================================================

-- Languages table - Supported languages configuration
CREATE TABLE IF NOT EXISTS languages (
    language_id TEXT PRIMARY KEY,
    language_name TEXT NOT NULL,
    native_name TEXT NOT NULL,
    language_code TEXT UNIQUE NOT NULL, -- ISO 639-1 code (en, es, fr, etc.)
    country_code TEXT, -- ISO 3166-1 alpha-2 (US, ES, FR, etc.)
    locale_code TEXT UNIQUE NOT NULL, -- Full locale (en-US, es-ES, fr-FR, etc.)
    direction TEXT DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    flag_icon TEXT, -- Flag emoji or icon class
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Translation keys table - Master list of translatable strings
CREATE TABLE IF NOT EXISTS translation_keys (
    key_id TEXT PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL, -- Dot notation key (e.g., 'nav.home', 'button.save')
    key_group TEXT NOT NULL, -- Group/namespace (e.g., 'navigation', 'forms', 'messages')
    description TEXT,
    context TEXT, -- Additional context for translators
    is_html BOOLEAN DEFAULT 0, -- Whether the content contains HTML
    is_plural BOOLEAN DEFAULT 0, -- Whether the key supports pluralization
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Translations table - Actual translated content
CREATE TABLE IF NOT EXISTS translations (
    translation_id TEXT PRIMARY KEY,
    key_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    plural_forms TEXT, -- JSON object for plural forms
    is_approved BOOLEAN DEFAULT 0,
    translator_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES translation_keys(key_id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE,
    UNIQUE(key_id, language_id)
);

-- User language preferences
CREATE TABLE IF NOT EXISTS user_language_preferences (
    preference_id TEXT PRIMARY KEY,
    user_id TEXT,
    language_id TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 1,
    auto_detect BOOLEAN DEFAULT 1,
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    time_format TEXT DEFAULT '12h',
    timezone TEXT DEFAULT 'UTC',
    number_format TEXT DEFAULT 'en-US',
    currency_code TEXT DEFAULT 'USD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE
);

-- Translation statistics and analytics
CREATE TABLE IF NOT EXISTS translation_analytics (
    analytics_id TEXT PRIMARY KEY,
    language_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_keys INTEGER DEFAULT 0,
    translated_keys INTEGER DEFAULT 0,
    approved_keys INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    page_views INTEGER DEFAULT 0,
    user_sessions INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE,
    UNIQUE(language_id, date)
);

-- Translation change history
CREATE TABLE IF NOT EXISTS translation_history (
    history_id TEXT PRIMARY KEY,
    translation_id TEXT NOT NULL,
    old_text TEXT,
    new_text TEXT NOT NULL,
    change_type TEXT DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'approve', 'reject')),
    changed_by TEXT,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (translation_id) REFERENCES translations(translation_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_languages_active ON languages(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_default ON languages(is_default);
CREATE INDEX IF NOT EXISTS idx_translation_keys_group ON translation_keys(key_group);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_id);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key_id);
CREATE INDEX IF NOT EXISTS idx_translations_approved ON translations(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_language_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_language_date ON translation_analytics(language_id, date);

-- Insert default languages
INSERT OR IGNORE INTO languages (language_id, language_name, native_name, language_code, country_code, locale_code, direction, is_active, is_default, completion_percentage, flag_icon, sort_order) VALUES
('lang_en_us', 'English (US)', 'English', 'en', 'US', 'en-US', 'ltr', 1, 1, 100.00, '🇺🇸', 1),
('lang_es_es', 'Spanish (Spain)', 'Español', 'es', 'ES', 'es-ES', 'ltr', 1, 0, 85.50, '🇪🇸', 2),
('lang_fr_fr', 'French (France)', 'Français', 'fr', 'FR', 'fr-FR', 'ltr', 1, 0, 78.25, '🇫🇷', 3),
('lang_de_de', 'German (Germany)', 'Deutsch', 'de', 'DE', 'de-DE', 'ltr', 1, 0, 72.80, '🇩🇪', 4),
('lang_it_it', 'Italian (Italy)', 'Italiano', 'it', 'IT', 'it-IT', 'ltr', 1, 0, 65.40, '🇮🇹', 5),
('lang_pt_br', 'Portuguese (Brazil)', 'Português', 'pt', 'BR', 'pt-BR', 'ltr', 1, 0, 58.90, '🇧🇷', 6),
('lang_ja_jp', 'Japanese (Japan)', '日本語', 'ja', 'JP', 'ja-JP', 'ltr', 1, 0, 45.60, '🇯🇵', 7),
('lang_ko_kr', 'Korean (South Korea)', '한국어', 'ko', 'KR', 'ko-KR', 'ltr', 1, 0, 38.20, '🇰🇷', 8),
('lang_zh_cn', 'Chinese (Simplified)', '简体中文', 'zh', 'CN', 'zh-CN', 'ltr', 1, 0, 42.75, '🇨🇳', 9),
('lang_ar_sa', 'Arabic (Saudi Arabia)', 'العربية', 'ar', 'SA', 'ar-SA', 'rtl', 1, 0, 35.10, '🇸🇦', 10);

-- Insert sample translation key groups
INSERT OR IGNORE INTO translation_keys (key_id, key_name, key_group, description, context, is_html, is_plural) VALUES
-- Navigation keys
('key_nav_home', 'nav.home', 'navigation', 'Home navigation link', 'Main navigation menu', 0, 0),
('key_nav_interviews', 'nav.interviews', 'navigation', 'Interviews navigation link', 'Main navigation menu', 0, 0),
('key_nav_dashboard', 'nav.dashboard', 'navigation', 'Dashboard navigation link', 'Main navigation menu', 0, 0),
('key_nav_settings', 'nav.settings', 'navigation', 'Settings navigation link', 'Main navigation menu', 0, 0),
('key_nav_logout', 'nav.logout', 'navigation', 'Logout navigation link', 'Main navigation menu', 0, 0),

-- Button keys
('key_btn_save', 'button.save', 'buttons', 'Save button text', 'Form save action', 0, 0),
('key_btn_cancel', 'button.cancel', 'buttons', 'Cancel button text', 'Form cancel action', 0, 0),
('key_btn_delete', 'button.delete', 'buttons', 'Delete button text', 'Delete action', 0, 0),
('key_btn_edit', 'button.edit', 'buttons', 'Edit button text', 'Edit action', 0, 0),
('key_btn_create', 'button.create', 'buttons', 'Create button text', 'Create new item action', 0, 0),

-- Form keys
('key_form_email', 'form.email', 'forms', 'Email field label', 'User input forms', 0, 0),
('key_form_password', 'form.password', 'forms', 'Password field label', 'User input forms', 0, 0),
('key_form_name', 'form.name', 'forms', 'Name field label', 'User input forms', 0, 0),
('key_form_required', 'form.required', 'forms', 'Required field indicator', 'Form validation', 0, 0),

-- Message keys
('key_msg_success', 'message.success', 'messages', 'Generic success message', 'User feedback', 0, 0),
('key_msg_error', 'message.error', 'messages', 'Generic error message', 'User feedback', 0, 0),
('key_msg_loading', 'message.loading', 'messages', 'Loading message', 'User feedback', 0, 0),
('key_msg_welcome', 'message.welcome', 'messages', 'Welcome message', 'User greeting', 0, 0);

-- Insert English (default) translations
INSERT OR IGNORE INTO translations (translation_id, key_id, language_id, translated_text, is_approved) VALUES
-- Navigation translations
('trans_nav_home_en', 'key_nav_home', 'lang_en_us', 'Home', 1),
('trans_nav_interviews_en', 'key_nav_interviews', 'lang_en_us', 'Interviews', 1),
('trans_nav_dashboard_en', 'key_nav_dashboard', 'lang_en_us', 'Dashboard', 1),
('trans_nav_settings_en', 'key_nav_settings', 'lang_en_us', 'Settings', 1),
('trans_nav_logout_en', 'key_nav_logout', 'lang_en_us', 'Logout', 1),

-- Button translations
('trans_btn_save_en', 'key_btn_save', 'lang_en_us', 'Save', 1),
('trans_btn_cancel_en', 'key_btn_cancel', 'lang_en_us', 'Cancel', 1),
('trans_btn_delete_en', 'key_btn_delete', 'lang_en_us', 'Delete', 1),
('trans_btn_edit_en', 'key_btn_edit', 'lang_en_us', 'Edit', 1),
('trans_btn_create_en', 'key_btn_create', 'lang_en_us', 'Create', 1),

-- Form translations
('trans_form_email_en', 'key_form_email', 'lang_en_us', 'Email', 1),
('trans_form_password_en', 'key_form_password', 'lang_en_us', 'Password', 1),
('trans_form_name_en', 'key_form_name', 'lang_en_us', 'Name', 1),
('trans_form_required_en', 'key_form_required', 'lang_en_us', 'Required', 1),

-- Message translations
('trans_msg_success_en', 'key_msg_success', 'lang_en_us', 'Operation completed successfully', 1),
('trans_msg_error_en', 'key_msg_error', 'lang_en_us', 'An error occurred', 1),
('trans_msg_loading_en', 'key_msg_loading', 'lang_en_us', 'Loading...', 1),
('trans_msg_welcome_en', 'key_msg_welcome', 'lang_en_us', 'Welcome to Interviews.tv', 1);

-- Insert Spanish translations
INSERT OR IGNORE INTO translations (translation_id, key_id, language_id, translated_text, is_approved) VALUES
('trans_nav_home_es', 'key_nav_home', 'lang_es_es', 'Inicio', 1),
('trans_nav_interviews_es', 'key_nav_interviews', 'lang_es_es', 'Entrevistas', 1),
('trans_nav_dashboard_es', 'key_nav_dashboard', 'lang_es_es', 'Panel', 1),
('trans_nav_settings_es', 'key_nav_settings', 'lang_es_es', 'Configuración', 1),
('trans_nav_logout_es', 'key_nav_logout', 'lang_es_es', 'Cerrar Sesión', 1),
('trans_btn_save_es', 'key_btn_save', 'lang_es_es', 'Guardar', 1),
('trans_btn_cancel_es', 'key_btn_cancel', 'lang_es_es', 'Cancelar', 1),
('trans_btn_delete_es', 'key_btn_delete', 'lang_es_es', 'Eliminar', 1),
('trans_btn_edit_es', 'key_btn_edit', 'lang_es_es', 'Editar', 1),
('trans_btn_create_es', 'key_btn_create', 'lang_es_es', 'Crear', 1),
('trans_form_email_es', 'key_form_email', 'lang_es_es', 'Correo Electrónico', 1),
('trans_form_password_es', 'key_form_password', 'lang_es_es', 'Contraseña', 1),
('trans_form_name_es', 'key_form_name', 'lang_es_es', 'Nombre', 1),
('trans_form_required_es', 'key_form_required', 'lang_es_es', 'Requerido', 1),
('trans_msg_success_es', 'key_msg_success', 'lang_es_es', 'Operación completada exitosamente', 1),
('trans_msg_error_es', 'key_msg_error', 'lang_es_es', 'Ocurrió un error', 1),
('trans_msg_loading_es', 'key_msg_loading', 'lang_es_es', 'Cargando...', 1),
('trans_msg_welcome_es', 'key_msg_welcome', 'lang_es_es', 'Bienvenido a Interviews.tv', 1);

-- Insert sample analytics data
INSERT OR IGNORE INTO translation_analytics (analytics_id, language_id, date, total_keys, translated_keys, approved_keys, completion_rate, page_views, user_sessions) VALUES
('analytics_en_today', 'lang_en_us', DATE('now'), 18, 18, 18, 100.00, 1250, 320),
('analytics_es_today', 'lang_es_es', DATE('now'), 18, 18, 18, 100.00, 890, 245),
('analytics_fr_today', 'lang_fr_fr', DATE('now'), 18, 14, 12, 77.78, 420, 115),
('analytics_de_today', 'lang_de_de', DATE('now'), 18, 13, 11, 72.22, 380, 98),
('analytics_it_today', 'lang_it_it', DATE('now'), 18, 12, 10, 66.67, 290, 75);
