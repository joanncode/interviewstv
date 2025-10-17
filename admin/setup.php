<?php
/**
 * Setup Script - YouTube Interview Curation System
 * Interviews.tv - Admin-Only Bulk Import & Curation Platform
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once '../includes/youtube_config.php';
require_once '../includes/Database.php';

// Simple authentication check
session_start();
$setupKey = $_GET['key'] ?? '';
$validSetupKey = 'setup_youtube_curation_2025';

if ($setupKey !== $validSetupKey) {
    die('Access denied. Use: setup.php?key=' . $validSetupKey);
}

$db = getDB();
$messages = [];

try {
    // Create video_categories table
    $sql = "CREATE TABLE IF NOT EXISTS video_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'fas fa-video',
        color VARCHAR(7) DEFAULT '#FF0000',
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $db->raw($sql);
    $messages[] = "✅ Created video_categories table";

    // Insert default categories
    $categories = [
        ['Innovation & Invention', 'innovation', 'Breakthrough technologies, patents, and revolutionary ideas', 'fas fa-lightbulb', '#FFD700', 1],
        ['Engineering', 'engineering', 'Technical deep-dives, engineering challenges, and solutions', 'fas fa-cogs', '#4CAF50', 2],
        ['Microcomputing', 'microcomputing', 'Embedded systems, IoT, hardware hacking, maker movement', 'fas fa-microchip', '#2196F3', 3],
        ['Artificial Intelligence', 'ai', 'AI research, machine learning, neural networks, ethics', 'fas fa-robot', '#9C27B0', 4],
        ['Emerging Technologies', 'emerging-tech', 'Quantum computing, biotechnology, space technology', 'fas fa-rocket', '#FF5722', 5],
        ['Entrepreneurship', 'entrepreneurship', 'Startup stories, funding, business innovation', 'fas fa-chart-line', '#795548', 6],
        ['Open Source', 'open-source', 'Community projects, collaborative development', 'fab fa-github', '#607D8B', 7],
        ['Future Technology', 'future-tech', 'Predictions, trends, paradigm shifts', 'fas fa-crystal-ball', '#E91E63', 8]
    ];

    foreach ($categories as $cat) {
        if (!$db->exists('video_categories', 'slug = ?', [$cat[1]])) {
            $db->insert('video_categories', [
                'name' => $cat[0],
                'slug' => $cat[1],
                'description' => $cat[2],
                'icon' => $cat[3],
                'color' => $cat[4],
                'sort_order' => $cat[5]
            ]);
        }
    }
    $messages[] = "✅ Inserted default categories";

    // Create video_tags table
    $sql = "CREATE TABLE IF NOT EXISTS video_tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        usage_count INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $db->raw($sql);
    $messages[] = "✅ Created video_tags table";

    // Insert common tags
    $tags = [
        ['Machine Learning', 'machine-learning', 'AI and ML algorithms, models, applications', TRUE],
        ['Hardware', 'hardware', 'Physical computing devices, circuits, components', TRUE],
        ['Software Development', 'software-dev', 'Programming, coding, software engineering', TRUE],
        ['Startup', 'startup', 'New companies, entrepreneurship, business development', TRUE],
        ['Research', 'research', 'Academic and industry research projects', TRUE],
        ['Open Source', 'open-source', 'Community-driven development projects', TRUE],
        ['IoT', 'iot', 'Internet of Things, connected devices', TRUE],
        ['Blockchain', 'blockchain', 'Distributed ledger technology, cryptocurrency', TRUE],
        ['Robotics', 'robotics', 'Automated systems, mechanical engineering', TRUE],
        ['3D Printing', '3d-printing', 'Additive manufacturing, prototyping', TRUE]
    ];

    foreach ($tags as $tag) {
        if (!$db->exists('video_tags', 'slug = ?', [$tag[1]])) {
            $db->insert('video_tags', [
                'name' => $tag[0],
                'slug' => $tag[1],
                'description' => $tag[2],
                'is_featured' => $tag[3]
            ]);
        }
    }
    $messages[] = "✅ Inserted default tags";

    // Create curated_videos table
    $sql = "CREATE TABLE IF NOT EXISTS curated_videos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        youtube_id VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        channel_name VARCHAR(200),
        channel_id VARCHAR(50),
        duration INT,
        published_at DATETIME,
        view_count BIGINT DEFAULT 0,
        like_count INT DEFAULT 0,
        comment_count INT DEFAULT 0,
        thumbnail_url VARCHAR(500),
        embed_url VARCHAR(500),
        category_id INT,
        status ENUM('pending', 'approved', 'rejected', 'archived', 'featured') DEFAULT 'pending',
        quality_score DECIMAL(3,2) DEFAULT 0.00,
        innovation_score DECIMAL(3,2) DEFAULT 0.00,
        relevance_score DECIMAL(3,2) DEFAULT 0.00,
        admin_notes TEXT,
        featured_until DATETIME NULL,
        view_count_local INT DEFAULT 0,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES video_categories(id) ON DELETE SET NULL,
        INDEX idx_youtube_id (youtube_id),
        INDEX idx_status (status),
        INDEX idx_category (category_id),
        INDEX idx_quality_score (quality_score),
        INDEX idx_published_at (published_at)
    )";
    $db->raw($sql);
    $messages[] = "✅ Created curated_videos table";

    // Create video_tag_relations table
    $sql = "CREATE TABLE IF NOT EXISTS video_tag_relations (
        video_id INT,
        tag_id INT,
        confidence_score DECIMAL(3,2) DEFAULT 1.00,
        is_manual BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (video_id, tag_id),
        FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES video_tags(id) ON DELETE CASCADE
    )";
    $db->raw($sql);
    $messages[] = "✅ Created video_tag_relations table";

    // Create video_comments table
    $sql = "CREATE TABLE IF NOT EXISTS video_comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        video_id INT NOT NULL,
        user_id INT NULL,
        parent_id INT NULL,
        username VARCHAR(100),
        email VARCHAR(255),
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        is_flagged BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT TRUE,
        like_count INT DEFAULT 0,
        dislike_count INT DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES video_comments(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_created_at (created_at)
    )";
    $db->raw($sql);
    $messages[] = "✅ Created video_comments table";

    // Create video_ratings table
    $sql = "CREATE TABLE IF NOT EXISTS video_ratings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        video_id INT NOT NULL,
        user_id INT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_rating (video_id, user_id),
        UNIQUE KEY unique_anonymous_rating (video_id, ip_address),
        INDEX idx_video_rating (video_id, rating)
    )";
    $db->raw($sql);
    $messages[] = "✅ Created video_ratings table";

    // Create curation_queue table
    $sql = "CREATE TABLE IF NOT EXISTS curation_queue (
        id INT PRIMARY KEY AUTO_INCREMENT,
        youtube_url VARCHAR(500) NOT NULL,
        youtube_id VARCHAR(20),
        suggested_category_id INT,
        suggested_tags TEXT,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        status ENUM('pending', 'processing', 'completed', 'failed', 'duplicate') DEFAULT 'pending',
        admin_id INT,
        notes TEXT,
        error_message TEXT,
        batch_id VARCHAR(50),
        source VARCHAR(100) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        FOREIGN KEY (suggested_category_id) REFERENCES video_categories(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_batch_id (batch_id),
        INDEX idx_youtube_id (youtube_id)
    )";
    $db->raw($sql);
    $messages[] = "✅ Created curation_queue table";

    // Create scraping_logs table
    $sql = "CREATE TABLE IF NOT EXISTS scraping_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        operation_type ENUM('single_import', 'bulk_import', 'metadata_update', 'availability_check', 'api_call') NOT NULL,
        youtube_id VARCHAR(20),
        api_calls_used INT DEFAULT 0,
        success_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        processing_time_ms INT,
        memory_usage_mb DECIMAL(8,2),
        batch_id VARCHAR(50),
        admin_id INT,
        error_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_operation_type (operation_type),
        INDEX idx_created_at (created_at),
        INDEX idx_batch_id (batch_id)
    )";
    $db->raw($sql);
    $messages[] = "✅ Created scraping_logs table";

    // Create admin_users table
    $sql = "CREATE TABLE IF NOT EXISTS admin_users (
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
    )";
    $db->raw($sql);
    $messages[] = "✅ Created admin_users table";

    // Insert default admin user
    if (!$db->exists('admin_users', 'username = ?', ['admin'])) {
        $db->insert('admin_users', [
            'username' => 'admin',
            'email' => 'admin@interviews.tv',
            'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
            'full_name' => 'System Administrator',
            'role' => 'admin'
        ]);
        $messages[] = "✅ Created default admin user (admin/admin123)";
    }

    // Create views
    $sql = "CREATE OR REPLACE VIEW approved_videos AS
        SELECT v.*, c.name as category_name, c.slug as category_slug, c.color as category_color
        FROM curated_videos v
        LEFT JOIN video_categories c ON v.category_id = c.id
        WHERE v.status = 'approved' AND v.is_available = TRUE";
    $db->raw($sql);
    $messages[] = "✅ Created approved_videos view";

    $sql = "CREATE OR REPLACE VIEW featured_videos AS
        SELECT v.*, c.name as category_name, c.slug as category_slug
        FROM curated_videos v
        LEFT JOIN video_categories c ON v.category_id = c.id
        WHERE v.status = 'featured' 
        AND (v.featured_until IS NULL OR v.featured_until > NOW())
        AND v.is_available = TRUE
        ORDER BY v.quality_score DESC, v.innovation_score DESC";
    $db->raw($sql);
    $messages[] = "✅ Created featured_videos view";

    $messages[] = "🎉 YouTube Interview Curation System setup completed successfully!";

} catch (Exception $e) {
    $messages[] = "❌ Error: " . $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup - YouTube Interview Curation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #1a1a1a; color: white; font-family: monospace; }
        .container { max-width: 800px; margin-top: 50px; }
        .setup-log { background: #2a2a2a; border: 1px solid #444; border-radius: 8px; padding: 20px; }
        .message { margin: 10px 0; padding: 8px 12px; border-radius: 4px; }
        .success { background: rgba(40, 167, 69, 0.2); border-left: 4px solid #28a745; }
        .error { background: rgba(220, 53, 69, 0.2); border-left: 4px solid #dc3545; }
        .btn-primary { background: #FF0000; border-color: #FF0000; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="text-center mb-4">
            <i class="fas fa-cogs"></i> YouTube Curation Setup
        </h1>
        
        <div class="setup-log">
            <h5>Setup Log:</h5>
            <?php foreach ($messages as $message): ?>
                <div class="message <?= strpos($message, '❌') !== false ? 'error' : 'success' ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div class="text-center mt-4">
            <a href="login.php" class="btn btn-primary">
                <i class="fas fa-sign-in-alt"></i> Go to Admin Login
            </a>
            <a href="../public/browse.php" class="btn btn-outline-light ms-2">
                <i class="fas fa-globe"></i> View Public Site
            </a>
        </div>
        
        <div class="alert alert-warning mt-4">
            <strong>Security Note:</strong> Delete this setup.php file after setup is complete!
        </div>
    </div>
</body>
</html>
