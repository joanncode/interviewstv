-- YouTube Interview Curation System Database Schema
-- Interviews.tv - Admin-Only Bulk Import & Curation Platform
-- Created: October 17, 2025

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS video_tag_relations;
DROP TABLE IF EXISTS video_comments;
DROP TABLE IF EXISTS video_ratings;
DROP TABLE IF EXISTS curation_queue;
DROP TABLE IF EXISTS scraping_logs;
DROP TABLE IF EXISTS curated_videos;
DROP TABLE IF EXISTS video_categories;
DROP TABLE IF EXISTS video_tags;

-- Video Categories Table
CREATE TABLE video_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'fas fa-video',
    color VARCHAR(7) DEFAULT '#FF0000', -- hex color
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default categories for innovation content
INSERT INTO video_categories (name, slug, description, icon, color, sort_order) VALUES
('Innovation & Invention', 'innovation', 'Breakthrough technologies, patents, and revolutionary ideas', 'fas fa-lightbulb', '#FFD700', 1),
('Engineering', 'engineering', 'Technical deep-dives, engineering challenges, and solutions', 'fas fa-cogs', '#4CAF50', 2),
('Microcomputing', 'microcomputing', 'Embedded systems, IoT, hardware hacking, maker movement', 'fas fa-microchip', '#2196F3', 3),
('Artificial Intelligence', 'ai', 'AI research, machine learning, neural networks, ethics', 'fas fa-robot', '#9C27B0', 4),
('Emerging Technologies', 'emerging-tech', 'Quantum computing, biotechnology, space technology', 'fas fa-rocket', '#FF5722', 5),
('Entrepreneurship', 'entrepreneurship', 'Startup stories, funding, business innovation', 'fas fa-chart-line', '#795548', 6),
('Open Source', 'open-source', 'Community projects, collaborative development', 'fab fa-github', '#607D8B', 7),
('Future Technology', 'future-tech', 'Predictions, trends, paradigm shifts', 'fas fa-crystal-ball', '#E91E63', 8);

-- Video Tags Table
CREATE TABLE video_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    usage_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert common tags for technical content
INSERT INTO video_tags (name, slug, description, is_featured) VALUES
('Machine Learning', 'machine-learning', 'AI and ML algorithms, models, applications', TRUE),
('Hardware', 'hardware', 'Physical computing devices, circuits, components', TRUE),
('Software Development', 'software-dev', 'Programming, coding, software engineering', TRUE),
('Startup', 'startup', 'New companies, entrepreneurship, business development', TRUE),
('Research', 'research', 'Academic and industry research projects', TRUE),
('Open Source', 'open-source', 'Community-driven development projects', TRUE),
('IoT', 'iot', 'Internet of Things, connected devices', TRUE),
('Blockchain', 'blockchain', 'Distributed ledger technology, cryptocurrency', TRUE),
('Robotics', 'robotics', 'Automated systems, mechanical engineering', TRUE),
('3D Printing', '3d-printing', 'Additive manufacturing, prototyping', TRUE);

-- Curated Videos Table (Main content table)
CREATE TABLE curated_videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    channel_name VARCHAR(200),
    channel_id VARCHAR(50),
    duration INT, -- seconds
    published_at DATETIME,
    view_count BIGINT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    thumbnail_url VARCHAR(500),
    embed_url VARCHAR(500),
    category_id INT,
    status ENUM('pending', 'approved', 'rejected', 'archived', 'featured') DEFAULT 'pending',
    quality_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 10.00
    innovation_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 10.00
    relevance_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 10.00
    admin_notes TEXT,
    featured_until DATETIME NULL, -- for temporary featuring
    view_count_local INT DEFAULT 0, -- views on our platform
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE, -- YouTube availability
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES video_categories(id) ON DELETE SET NULL,
    INDEX idx_youtube_id (youtube_id),
    INDEX idx_status (status),
    INDEX idx_category (category_id),
    INDEX idx_quality_score (quality_score),
    INDEX idx_published_at (published_at),
    INDEX idx_featured (status, featured_until)
);

-- Video Tag Relationships (Many-to-Many)
CREATE TABLE video_tag_relations (
    video_id INT,
    tag_id INT,
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- AI confidence in tag assignment
    is_manual BOOLEAN DEFAULT FALSE, -- manually assigned vs auto-assigned
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, tag_id),
    FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES video_tags(id) ON DELETE CASCADE
);

-- Video Comments Table (Uncensored discussions)
CREATE TABLE video_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous comments
    parent_id INT NULL, -- for replies
    username VARCHAR(100), -- for anonymous or display name
    email VARCHAR(255), -- optional for notifications
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE, -- start with approval, moderate after
    like_count INT DEFAULT 0,
    dislike_count INT DEFAULT 0,
    ip_address VARCHAR(45), -- for moderation purposes
    user_agent TEXT, -- for spam detection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES video_comments(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at),
    INDEX idx_approved (is_approved, is_flagged)
);

-- Video Ratings Table
CREATE TABLE video_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous ratings
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT, -- optional written review
    ip_address VARCHAR(45), -- prevent duplicate anonymous ratings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_rating (video_id, user_id),
    UNIQUE KEY unique_anonymous_rating (video_id, ip_address),
    INDEX idx_video_rating (video_id, rating)
);

-- Curation Queue Table (Admin workflow)
CREATE TABLE curation_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    youtube_url VARCHAR(500) NOT NULL,
    youtube_id VARCHAR(20), -- extracted from URL
    suggested_category_id INT,
    suggested_tags TEXT, -- comma-separated tag names
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'processing', 'completed', 'failed', 'duplicate') DEFAULT 'pending',
    admin_id INT, -- who is processing this
    notes TEXT,
    error_message TEXT, -- if processing failed
    batch_id VARCHAR(50), -- for bulk imports
    source VARCHAR(100) DEFAULT 'manual', -- manual, csv, api, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (suggested_category_id) REFERENCES video_categories(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_batch_id (batch_id),
    INDEX idx_youtube_id (youtube_id)
);

-- Scraping Logs Table (Track API usage and errors)
CREATE TABLE scraping_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('single_import', 'bulk_import', 'metadata_update', 'availability_check') NOT NULL,
    youtube_id VARCHAR(20),
    api_calls_used INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    processing_time_ms INT, -- milliseconds
    memory_usage_mb DECIMAL(8,2), -- megabytes
    batch_id VARCHAR(50),
    admin_id INT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operation_type (operation_type),
    INDEX idx_created_at (created_at),
    INDEX idx_batch_id (batch_id)
);

-- Admin Users Table (Simple admin authentication)
CREATE TABLE admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role ENUM('admin', 'moderator', 'curator') DEFAULT 'curator',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Create indexes for performance
CREATE INDEX idx_videos_compound ON curated_videos(status, category_id, quality_score DESC);
CREATE INDEX idx_comments_compound ON video_comments(video_id, is_approved, created_at DESC);
CREATE INDEX idx_queue_processing ON curation_queue(status, priority, created_at);

-- Views for common queries
CREATE VIEW approved_videos AS
SELECT v.*, c.name as category_name, c.slug as category_slug, c.color as category_color
FROM curated_videos v
LEFT JOIN video_categories c ON v.category_id = c.id
WHERE v.status = 'approved' AND v.is_available = TRUE;

CREATE VIEW featured_videos AS
SELECT v.*, c.name as category_name, c.slug as category_slug
FROM curated_videos v
LEFT JOIN video_categories c ON v.category_id = c.id
WHERE v.status = 'featured' 
AND (v.featured_until IS NULL OR v.featured_until > NOW())
AND v.is_available = TRUE
ORDER BY v.quality_score DESC, v.innovation_score DESC;

-- Success message
SELECT 'YouTube Interview Curation Database Schema Created Successfully!' as message;
