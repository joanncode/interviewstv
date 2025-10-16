<?php
/**
 * Setup Live Streaming Infrastructure
 * Creates necessary database tables and configurations for live streaming
 */

try {
    echo "Setting up Live Streaming Infrastructure...\n";

    // Initialize database connection using MySQL
    $host = 'localhost';
    $dbname = 'interviews_tv';
    $username = 'interviews_user';
    $password = 'interviews_pass';

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        echo "✓ Database connection established\n";
    } catch (PDOException $e) {
        echo "❌ Database connection failed: " . $e->getMessage() . "\n";
        exit(1);
    }
    
    // Create live_streams table
    $sql = "
    CREATE TABLE IF NOT EXISTS live_streams (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        stream_key VARCHAR(64) UNIQUE NOT NULL,
        category VARCHAR(50) DEFAULT 'interview',
        
        -- Stream Configuration
        quality ENUM('360p', '480p', '720p', '1080p') DEFAULT '720p',
        max_viewers INT DEFAULT 1000,
        recording_enabled BOOLEAN DEFAULT TRUE,
        chat_enabled BOOLEAN DEFAULT TRUE,
        moderation_enabled BOOLEAN DEFAULT TRUE,
        
        -- Stream Status
        status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
        scheduled_start DATETIME,
        started_at DATETIME,
        ended_at DATETIME,
        
        -- Metadata
        thumbnail_url VARCHAR(500),
        tags JSON,
        is_featured BOOLEAN DEFAULT FALSE,
        is_private BOOLEAN DEFAULT FALSE,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        -- Indexes
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at),
        INDEX idx_stream_key (stream_key),
        INDEX idx_scheduled_start (scheduled_start)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created live_streams table\n";
    
    // Create stream_sessions table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_sessions (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(100),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        duration INT DEFAULT 0,
        peak_viewers INT DEFAULT 0,
        total_viewers INT DEFAULT 0,
        bytes_sent BIGINT DEFAULT 0,
        bytes_received BIGINT DEFAULT 0,
        quality_switches INT DEFAULT 0,
        disconnections INT DEFAULT 0,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        INDEX idx_stream_id (stream_id),
        INDEX idx_started_at (started_at)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_sessions table\n";
    
    // Create stream_viewers table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_viewers (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        user_id INT NULL,
        viewer_id VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL,
        watch_duration INT DEFAULT 0,
        quality_level VARCHAR(10) DEFAULT '720p',
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_stream_id (stream_id),
        INDEX idx_user_id (user_id),
        INDEX idx_joined_at (joined_at)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_viewers table\n";
    
    // Create stream_chat table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_chat (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        user_id INT NULL,
        username VARCHAR(50),
        message TEXT NOT NULL,
        message_type ENUM('message', 'system', 'moderator') DEFAULT 'message',
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by INT NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_stream_id (stream_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_chat table\n";
    
    // Create stream_recordings table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_recordings (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT DEFAULT 0,
        duration INT DEFAULT 0,
        format VARCHAR(10) DEFAULT 'mp4',
        quality VARCHAR(10) DEFAULT '720p',
        status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
        thumbnail_url VARCHAR(500),
        download_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        INDEX idx_stream_id (stream_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_recordings table\n";
    
    // Create stream_analytics table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_analytics (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        metric_name VARCHAR(50) NOT NULL,
        metric_value DECIMAL(15,2) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        INDEX idx_stream_id (stream_id),
        INDEX idx_metric_name (metric_name),
        INDEX idx_timestamp (timestamp)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_analytics table\n";
    
    // Create stream_donations table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_donations (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        user_id INT NULL,
        donor_name VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        message TEXT,
        payment_method VARCHAR(50),
        payment_id VARCHAR(100),
        payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        is_anonymous BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_stream_id (stream_id),
        INDEX idx_user_id (user_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_donations table\n";
    
    // Create stream_quality_metrics table
    $sql = "
    CREATE TABLE IF NOT EXISTS stream_quality_metrics (
        id VARCHAR(36) PRIMARY KEY,
        stream_id VARCHAR(36) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bitrate INT,
        fps INT,
        resolution VARCHAR(20),
        dropped_frames INT DEFAULT 0,
        network_latency INT DEFAULT 0,
        cpu_usage DECIMAL(5,2) DEFAULT 0,
        memory_usage DECIMAL(5,2) DEFAULT 0,
        
        FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
        INDEX idx_stream_id (stream_id),
        INDEX idx_timestamp (timestamp)
    )";
    
    $pdo->exec($sql);
    echo "✓ Created stream_quality_metrics table\n";
    
    echo "\n🎉 Live Streaming Infrastructure setup completed successfully!\n";
    echo "\nAvailable endpoints:\n";
    echo "POST   /api/streams              - Create new stream\n";
    echo "GET    /api/streams/live         - Get live streams\n";
    echo "GET    /api/streams/{id}         - Get stream details\n";
    echo "PUT    /api/streams/{id}         - Update stream\n";
    echo "POST   /api/streams/{id}/start   - Start stream\n";
    echo "POST   /api/streams/{id}/stop    - Stop stream\n";
    echo "POST   /api/streams/{id}/join    - Join stream as viewer\n";
    echo "POST   /api/streams/{id}/leave   - Leave stream\n";
    echo "GET    /api/streams/{id}/stats   - Get stream statistics\n";
    echo "\nYou can now create and manage live streams!\n";
    
} catch (Exception $e) {
    echo "❌ Error setting up streaming infrastructure: " . $e->getMessage() . "\n";
    exit(1);
}
?>
