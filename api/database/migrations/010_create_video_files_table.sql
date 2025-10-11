-- Video Files Storage Table
CREATE TABLE IF NOT EXISTS video_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id VARCHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    format VARCHAR(10) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    
    -- Video metadata
    duration DECIMAL(10,2) NULL,
    width INTEGER NULL,
    height INTEGER NULL,
    bitrate INTEGER NULL,
    framerate DECIMAL(5,2) NULL,
    codec VARCHAR(50) NULL,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processed_at DATETIME NULL,
    
    -- Thumbnails
    thumbnail_path VARCHAR(500) NULL,
    thumbnail_count INTEGER DEFAULT 0,
    
    -- Storage metadata
    metadata TEXT NULL, -- JSON metadata
    checksum VARCHAR(64) NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- Foreign key
    FOREIGN KEY (recording_id) REFERENCES interview_recordings(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_files_recording_id ON video_files(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_files_format ON video_files(format);
CREATE INDEX IF NOT EXISTS idx_video_files_created_at ON video_files(created_at);
CREATE INDEX IF NOT EXISTS idx_video_files_processing_status ON video_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_files_deleted_at ON video_files(deleted_at);

-- Video Processing Queue Table
CREATE TABLE IF NOT EXISTS video_processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_file_id INTEGER NOT NULL,
    recording_id VARCHAR(36) NOT NULL,
    processing_type VARCHAR(50) NOT NULL, -- 'compression', 'thumbnail', 'metadata'
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- Processing parameters
    input_path VARCHAR(500) NOT NULL,
    output_path VARCHAR(500) NULL,
    processing_params TEXT NULL, -- JSON parameters
    
    -- Progress tracking
    progress_percent INTEGER DEFAULT 0,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    
    -- Error handling
    error_message TEXT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (video_file_id) REFERENCES video_files(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES interview_recordings(id) ON DELETE CASCADE
);

-- Indexes for processing queue
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON video_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON video_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_processing_queue_type ON video_processing_queue(processing_type);
CREATE INDEX IF NOT EXISTS idx_processing_queue_created_at ON video_processing_queue(created_at);

-- Video Thumbnails Table
CREATE TABLE IF NOT EXISTS video_thumbnails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_file_id INTEGER NOT NULL,
    recording_id VARCHAR(36) NOT NULL,
    
    -- Thumbnail info
    thumbnail_path VARCHAR(500) NOT NULL,
    thumbnail_type VARCHAR(20) NOT NULL, -- 'poster', 'timeline', 'preview'
    timestamp_seconds DECIMAL(10,2) NULL, -- Position in video
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    
    -- Metadata
    is_primary BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (video_file_id) REFERENCES video_files(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES interview_recordings(id) ON DELETE CASCADE
);

-- Indexes for thumbnails
CREATE INDEX IF NOT EXISTS idx_thumbnails_video_file_id ON video_thumbnails(video_file_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_recording_id ON video_thumbnails(recording_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_type ON video_thumbnails(thumbnail_type);
CREATE INDEX IF NOT EXISTS idx_thumbnails_primary ON video_thumbnails(is_primary);

-- Storage Statistics Table (for monitoring)
CREATE TABLE IF NOT EXISTS storage_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    
    -- File counts
    total_files INTEGER DEFAULT 0,
    total_recordings INTEGER DEFAULT 0,
    total_thumbnails INTEGER DEFAULT 0,
    
    -- Storage usage
    total_size_bytes BIGINT DEFAULT 0,
    recordings_size_bytes BIGINT DEFAULT 0,
    thumbnails_size_bytes BIGINT DEFAULT 0,
    
    -- Format breakdown
    mp4_files INTEGER DEFAULT 0,
    webm_files INTEGER DEFAULT 0,
    other_files INTEGER DEFAULT 0,
    
    -- Processing stats
    pending_processing INTEGER DEFAULT 0,
    failed_processing INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Index for statistics
CREATE INDEX IF NOT EXISTS idx_storage_stats_date ON storage_statistics(date);

-- Insert initial storage statistics
INSERT OR IGNORE INTO storage_statistics (date) VALUES (DATE('now'));
