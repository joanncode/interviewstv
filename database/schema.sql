-- Interviews.tv MariaDB Database Schema
-- Created for comprehensive platform functionality

-- Create database
CREATE DATABASE IF NOT EXISTS interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE interviews_tv;

-- Users table - Core user accounts
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'creator', 'business', 'user') DEFAULT 'user',
    avatar_url VARCHAR(500) NULL,
    hero_banner_url VARCHAR(500) NULL,
    bio TEXT NULL,
    location VARCHAR(255) NULL,
    website VARCHAR(500) NULL,
    phone VARCHAR(50) NULL,
    company VARCHAR(255) NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);

-- User permissions table
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (user_id, permission)
);

-- Businesses table - Business directory
CREATE TABLE businesses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    industry VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    website VARCHAR(500) NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    founded_year YEAR NULL,
    employee_count ENUM('1-10', '11-50', '51-200', '201-500', '500+') NULL,
    logo_url VARCHAR(500) NULL,
    banner_url VARCHAR(500) NULL,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_slug (slug),
    INDEX idx_industry (industry),
    INDEX idx_location (location),
    INDEX idx_rating (rating),
    FULLTEXT idx_search (name, description, location)
);

-- Categories table - Content categorization
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NULL,
    type ENUM('interview', 'gallery', 'event', 'business') DEFAULT 'interview',
    color VARCHAR(7) DEFAULT '#007bff',
    icon VARCHAR(100) DEFAULT 'fas fa-folder',
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_categories_type (type),
    INDEX idx_categories_parent (parent_id),
    INDEX idx_categories_slug (slug),
    INDEX idx_categories_active (is_active)
);

-- Interviews table - Interview content
CREATE TABLE interviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id INT NOT NULL,
    business_id INT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    video_url VARCHAR(500) NULL,
    audio_url VARCHAR(500) NULL,
    thumbnail_url VARCHAR(500) NULL,
    duration_seconds INT NULL,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    moderation_status ENUM('pending', 'approved', 'rejected', 'flagged', 'hidden', 'deleted', 'auto_hidden') DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_category (category),
    INDEX idx_published (is_published, published_at),
    INDEX idx_featured (is_featured),
    INDEX idx_views (view_count),
    FULLTEXT idx_search (title, description)
);

-- Comments table - Interview comments
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    interview_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT NULL,
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_interview (interview_id),
    INDEX idx_user (user_id),
    INDEX idx_parent (parent_id),
    INDEX idx_created (created_at)
);

-- Content flags table - User reports and moderation flags
CREATE TABLE content_flags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    content_type ENUM('interview', 'comment', 'gallery', 'user') NOT NULL,
    reason ENUM('spam', 'inappropriate', 'copyright', 'harassment', 'fake', 'other') NOT NULL,
    reported_by INT NOT NULL,
    description TEXT NULL,
    status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_flags_content (content_id, content_type),
    INDEX idx_content_flags_status (status),
    INDEX idx_content_flags_reporter (reported_by)
);

-- Moderation actions table - Track moderator actions
CREATE TABLE moderation_actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    content_type ENUM('interview', 'comment', 'gallery', 'user') NOT NULL,
    moderator_id INT NOT NULL,
    action ENUM('approve', 'reject', 'hide', 'delete', 'warn', 'ban') NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_moderation_content (content_id, content_type),
    INDEX idx_moderation_moderator (moderator_id),
    INDEX idx_moderation_action (action)
);

-- Interview views table - Track content views for analytics
CREATE TABLE interview_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    interview_id INT NOT NULL,
    user_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    referrer VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_interview_views_interview (interview_id),
    INDEX idx_interview_views_user (user_id),
    INDEX idx_interview_views_date (created_at)
);

-- Security tables for validation and monitoring

-- Rate limiting table
CREATE TABLE rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_rate_limits_identifier (identifier),
    INDEX idx_rate_limits_action (action),
    INDEX idx_rate_limits_created (created_at)
);

-- Failed login attempts tracking
CREATE TABLE failed_login_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_failed_attempts_identifier (identifier),
    INDEX idx_failed_attempts_ip (ip_address),
    INDEX idx_failed_attempts_created (created_at)
);

-- Security event logging
CREATE TABLE security_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type VARCHAR(100) NOT NULL,
    event_data JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    user_id INT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_logs_event (event_type),
    INDEX idx_security_logs_ip (ip_address),
    INDEX idx_security_logs_severity (severity),
    INDEX idx_security_logs_created (created_at)
);

-- Banned IPs table
CREATE TABLE banned_ips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT NULL,
    banned_by INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_banned_ips_active (is_active),
    INDEX idx_banned_ips_expires (expires_at)
);

-- CSRF tokens table
CREATE TABLE csrf_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    action VARCHAR(100) NOT NULL,
    user_id INT NULL,
    session_id VARCHAR(255) NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_csrf_tokens_token (token),
    INDEX idx_csrf_tokens_expires (expires_at),
    INDEX idx_csrf_tokens_session (session_id)
);

-- API keys table for secure API access
CREATE TABLE api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    permissions JSON NULL,
    rate_limit_per_hour INT DEFAULT 1000,
    last_used_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_keys_user (user_id),
    INDEX idx_api_keys_active (is_active),
    INDEX idx_api_keys_expires (expires_at)
);

-- Follows table - User following relationships
CREATE TABLE follows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    following_type ENUM('user', 'business') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, following_id, following_type),
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id, following_type)
);

-- Likes table - Content likes
CREATE TABLE likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    likeable_id INT NOT NULL,
    likeable_type ENUM('interview', 'comment') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (user_id, likeable_id, likeable_type),
    INDEX idx_user (user_id),
    INDEX idx_likeable (likeable_id, likeable_type)
);

-- Views table - Content view tracking
CREATE TABLE views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    interview_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    INDEX idx_interview (interview_id),
    INDEX idx_user (user_id),
    INDEX idx_ip (ip_address),
    INDEX idx_created (created_at)
);

-- Business reviews table
CREATE TABLE business_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    business_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_business_review (business_id, user_id),
    INDEX idx_business (business_id),
    INDEX idx_rating (rating)
);

-- Interview requests table
CREATE TABLE interview_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id INT NOT NULL,
    business_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'accepted', 'declined', 'completed') DEFAULT 'pending',
    proposed_date DATETIME NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    INDEX idx_creator (creator_id),
    INDEX idx_business (business_id),
    INDEX idx_status (status)
);

-- User settings table
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_setting (user_id, setting_key)
);

-- File uploads table
CREATE TABLE file_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type ENUM('avatar', 'hero_banner', 'business_logo', 'business_banner', 'interview_video', 'interview_audio', 'interview_thumbnail') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (file_type),
    INDEX idx_created (created_at)
);
