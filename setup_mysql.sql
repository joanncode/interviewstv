-- Setup MySQL/MariaDB for Interviews.tv
-- Run this with: mysql < setup_mysql.sql

-- Create database
CREATE DATABASE IF NOT EXISTS interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS 'interviews_user'@'localhost' IDENTIFIED BY 'interviews_pass';

-- Grant privileges
GRANT ALL PRIVILEGES ON interviews_tv.* TO 'interviews_user'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE interviews_tv;

-- Users table - Core user accounts
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'creator', 'business', 'user') DEFAULT 'user',
    avatar_url VARCHAR(500) NULL,
    hero_banner_url VARCHAR(500) NULL,
    bio TEXT NULL,
    location VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    company VARCHAR(255) NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (user_id, permission)
);

-- Insert dummy users with proper password hashes
-- Password for all users is: password123
INSERT INTO users (id, email, password_hash, name, role, bio, location, website, email_verified, is_active) VALUES
(1, 'admin@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin', 'Platform Administrator with full system access', 'San Francisco, CA', 'https://interviews.tv', TRUE, TRUE),
(2, 'creator@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Content Creator', 'creator', 'Professional content creator specializing in business interviews', 'Los Angeles, CA', 'https://contentcreator.com', TRUE, TRUE),
(3, 'business@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Business Owner', 'business', 'Business profile manager and entrepreneur', 'New York, NY', 'https://mybusiness.com', TRUE, TRUE),
(4, 'user@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Regular User', 'user', 'Platform user interested in business content', 'Chicago, IL', NULL, TRUE, TRUE),
(5, 'john.doe@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'user', 'Software developer and tech enthusiast', 'Seattle, WA', 'https://johndoe.dev', TRUE, TRUE),
(6, 'jane.smith@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Smith', 'creator', 'Marketing specialist and content strategist', 'Austin, TX', 'https://janesmith.com', TRUE, TRUE),
(7, 'mike.wilson@startup.io', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike Wilson', 'business', 'Startup founder and entrepreneur', 'Boston, MA', 'https://startup.io', TRUE, TRUE),
(8, 'sarah.johnson@agency.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Johnson', 'creator', 'Digital marketing agency owner', 'Miami, FL', 'https://agency.com', TRUE, TRUE),
(9, 'david.brown@tech.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David Brown', 'user', 'Product manager at tech company', 'San Diego, CA', NULL, FALSE, TRUE),
(10, 'lisa.davis@consulting.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lisa Davis', 'business', 'Business consultant and advisor', 'Denver, CO', 'https://consulting.com', TRUE, TRUE),
(11, 'alex.garcia@freelance.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Garcia', 'creator', 'Freelance video producer', 'Portland, OR', 'https://freelance.com', TRUE, TRUE),
(12, 'emma.taylor@nonprofit.org', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emma Taylor', 'user', 'Nonprofit organization coordinator', 'Nashville, TN', 'https://nonprofit.org', TRUE, TRUE),
(13, 'ryan.martinez@ecommerce.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ryan Martinez', 'business', 'E-commerce platform founder', 'Phoenix, AZ', 'https://ecommerce.com', TRUE, TRUE),
(14, 'olivia.anderson@media.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Olivia Anderson', 'creator', 'Media production specialist', 'Atlanta, GA', 'https://media.com', TRUE, TRUE),
(15, 'chris.thomas@finance.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chris Thomas', 'user', 'Financial analyst and investor', 'Charlotte, NC', NULL, TRUE, TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    bio = VALUES(bio),
    location = VALUES(location),
    website = VALUES(website);

-- Insert user permissions
INSERT INTO user_permissions (user_id, permission) VALUES
-- Admin permissions
(1, 'all'),
-- Creator permissions
(2, 'create_content'), (2, 'manage_profile'), (2, 'conduct_interviews'),
(6, 'create_content'), (6, 'manage_profile'), (6, 'conduct_interviews'),
(8, 'create_content'), (8, 'manage_profile'), (8, 'conduct_interviews'),
(11, 'create_content'), (11, 'manage_profile'), (11, 'conduct_interviews'),
(14, 'create_content'), (14, 'manage_profile'), (14, 'conduct_interviews'),
-- Business permissions
(3, 'manage_business'), (3, 'manage_profile'), (3, 'respond_interviews'),
(7, 'manage_business'), (7, 'manage_profile'), (7, 'respond_interviews'),
(10, 'manage_business'), (10, 'manage_profile'), (10, 'respond_interviews'),
(13, 'manage_business'), (13, 'manage_profile'), (13, 'respond_interviews'),
-- User permissions
(4, 'view_content'), (4, 'manage_profile'),
(5, 'view_content'), (5, 'manage_profile'),
(9, 'view_content'), (9, 'manage_profile'),
(12, 'view_content'), (12, 'manage_profile'),
(15, 'view_content'), (15, 'manage_profile')
ON DUPLICATE KEY UPDATE permission = VALUES(permission);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Show success message
SELECT 'Database setup completed successfully!' as message;
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
