-- Backup System Tables Migration
-- Creates tables for backup and restore system management

-- Backup Records Table
-- Stores information about all system backups
CREATE TABLE IF NOT EXISTS backup_records (
    id VARCHAR(255) PRIMARY KEY,
    path TEXT NOT NULL,
    size BIGINT DEFAULT 0,
    created_at DATETIME NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    options TEXT, -- JSON encoded options
    output TEXT, -- Backup script output
    checksum VARCHAR(255),
    manifest TEXT, -- JSON encoded manifest
    s3_location TEXT,
    restored_at DATETIME,
    restored_by INTEGER,
    deleted_at DATETIME,
    deleted_by INTEGER
);

-- Backup Schedules Table
-- Stores scheduled backup configurations
CREATE TABLE IF NOT EXISTS backup_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'full', -- full, database, files
    frequency VARCHAR(50) NOT NULL DEFAULT 'daily', -- daily, weekly, monthly, custom
    time VARCHAR(10) NOT NULL DEFAULT '02:00', -- HH:MM format
    enabled BOOLEAN DEFAULT 1,
    description TEXT,
    cron_entry VARCHAR(255),
    options TEXT, -- JSON encoded options
    last_run_at DATETIME,
    last_run_status VARCHAR(50),
    last_run_output TEXT,
    next_run_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    created_by INTEGER
);

-- Backup Restore Log Table
-- Tracks all restore operations
CREATE TABLE IF NOT EXISTS backup_restore_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id VARCHAR(255) NOT NULL,
    restored_at DATETIME NOT NULL,
    restored_by INTEGER NOT NULL,
    restore_type VARCHAR(50) DEFAULT 'full', -- full, selective
    components_restored TEXT, -- JSON array of restored components
    pre_restore_backup_id VARCHAR(255), -- Backup created before restore
    status VARCHAR(50) DEFAULT 'pending',
    output TEXT,
    error_message TEXT,
    duration_seconds INTEGER
);

-- Backup Configuration Table
-- Stores system backup configuration
CREATE TABLE IF NOT EXISTS backup_configuration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string', -- string, integer, boolean, json
    description TEXT,
    is_sensitive BOOLEAN DEFAULT 0, -- For passwords, API keys, etc.
    updated_at DATETIME NOT NULL,
    updated_by INTEGER
);

-- Backup Storage Locations Table
-- Manages different backup storage locations
CREATE TABLE IF NOT EXISTS backup_storage_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- local, s3, ftp, sftp
    connection_config TEXT, -- JSON encoded connection details
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    max_retention_days INTEGER DEFAULT 30,
    max_storage_size BIGINT, -- In bytes
    current_usage BIGINT DEFAULT 0,
    last_sync_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Backup Verification Log Table
-- Tracks backup integrity verification
CREATE TABLE IF NOT EXISTS backup_verification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id VARCHAR(255) NOT NULL,
    verified_at DATETIME NOT NULL,
    verified_by INTEGER,
    verification_type VARCHAR(50) DEFAULT 'full', -- full, quick, checksum
    status VARCHAR(50) NOT NULL, -- passed, failed, warning
    checks_performed TEXT, -- JSON array of checks
    issues_found TEXT, -- JSON array of issues
    verification_duration INTEGER -- In seconds
);

-- Backup Notifications Table
-- Manages backup-related notifications
CREATE TABLE IF NOT EXISTS backup_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL, -- success, failure, warning, scheduled
    title VARCHAR(255) NOT NULL,
    message TEXT,
    backup_id VARCHAR(255),
    schedule_id INTEGER,
    recipient_email VARCHAR(255),
    sent_at DATETIME,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    created_at DATETIME NOT NULL
);

-- Insert default backup configuration
INSERT OR IGNORE INTO backup_configuration (config_key, config_value, config_type, description, updated_at) VALUES
('auto_backup_enabled', 'false', 'boolean', 'Enable automatic scheduled backups', datetime('now')),
('backup_retention_days', '30', 'integer', 'Number of days to retain backups', datetime('now')),
('compression_enabled', 'true', 'boolean', 'Enable backup compression', datetime('now')),
('compression_level', '6', 'integer', 'Compression level (1-9)', datetime('now')),
('s3_enabled', 'false', 'boolean', 'Enable S3 remote storage', datetime('now')),
('s3_bucket', '', 'string', 'S3 bucket name for backups', datetime('now')),
('notification_email', '', 'string', 'Email for backup notifications', datetime('now')),
('max_backup_size', '10737418240', 'integer', 'Maximum backup size in bytes (10GB)', datetime('now')),
('backup_schedule_time', '02:00', 'string', 'Default backup time (HH:MM)', datetime('now')),
('verify_backups', 'true', 'boolean', 'Automatically verify backup integrity', datetime('now')),
('cleanup_old_backups', 'true', 'boolean', 'Automatically cleanup old backups', datetime('now')),
('backup_database', 'true', 'boolean', 'Include database in backups', datetime('now')),
('backup_files', 'true', 'boolean', 'Include files in backups', datetime('now')),
('backup_uploads', 'true', 'boolean', 'Include uploads in backups', datetime('now')),
('backup_redis', 'true', 'boolean', 'Include Redis data in backups', datetime('now'));

-- Insert default local storage location
INSERT OR IGNORE INTO backup_storage_locations (name, type, connection_config, is_default, is_active, created_at) VALUES
('Local Storage', 'local', '{"path": "/backups/interviews-tv"}', 1, 1, datetime('now'));

-- Create default daily backup schedule
INSERT OR IGNORE INTO backup_schedules (name, type, frequency, time, enabled, description, cron_entry, created_at) VALUES
('Daily Full Backup', 'full', 'daily', '02:00', 0, 'Automated daily full system backup', '0 2 * * *', datetime('now'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backup_records_composite ON backup_records(type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_composite ON backup_schedules(enabled, frequency, next_run_at);
CREATE INDEX IF NOT EXISTS idx_restore_log_composite ON backup_restore_log(status, restored_at);
CREATE INDEX IF NOT EXISTS idx_verification_composite ON backup_verification_log(backup_id, status, verified_at);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS backup_summary AS
SELECT 
    br.id,
    br.type,
    br.status,
    br.created_at,
    br.size,
    br.description,
    CASE 
        WHEN br.s3_location IS NOT NULL THEN 'remote'
        ELSE 'local'
    END as storage_location,
    bvl.status as last_verification_status,
    bvl.verified_at as last_verified_at
FROM backup_records br
LEFT JOIN backup_verification_log bvl ON br.id = bvl.backup_id 
    AND bvl.verified_at = (
        SELECT MAX(verified_at) 
        FROM backup_verification_log 
        WHERE backup_id = br.id
    )
ORDER BY br.created_at DESC;

CREATE VIEW IF NOT EXISTS backup_statistics AS
SELECT 
    COUNT(*) as total_backups,
    SUM(size) as total_size,
    AVG(size) as average_size,
    MIN(created_at) as oldest_backup,
    MAX(created_at) as newest_backup,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
    ROUND(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) / COUNT(*), 2
    ) as success_rate
FROM backup_records
WHERE type = 'system';

-- Create triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_backup_storage_usage
AFTER INSERT ON backup_records
BEGIN
    UPDATE backup_storage_locations 
    SET current_usage = (
        SELECT COALESCE(SUM(size), 0) 
        FROM backup_records 
        WHERE status = 'completed' 
        AND deleted_at IS NULL
    )
    WHERE type = 'local';
END;

CREATE TRIGGER IF NOT EXISTS update_schedule_last_run
AFTER INSERT ON backup_records
WHEN NEW.type = 'scheduled'
BEGIN
    UPDATE backup_schedules 
    SET 
        last_run_at = NEW.created_at,
        last_run_status = NEW.status,
        next_run_at = CASE 
            WHEN frequency = 'daily' THEN datetime(NEW.created_at, '+1 day')
            WHEN frequency = 'weekly' THEN datetime(NEW.created_at, '+7 days')
            WHEN frequency = 'monthly' THEN datetime(NEW.created_at, '+1 month')
            ELSE next_run_at
        END
    WHERE id = CAST(json_extract(NEW.options, '$.schedule_id') AS INTEGER);
END;
