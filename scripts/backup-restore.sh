#!/bin/bash

# Interviews.tv Backup and Disaster Recovery Script
# This script handles database backups, file backups, and disaster recovery procedures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/backups/interviews-tv}"
S3_BUCKET="${S3_BUCKET:-interviews-tv-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-interviews_tv}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local deps=("mysqldump" "mysql" "redis-cli" "aws" "gzip" "tar")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "Required dependency '$dep' is not installed"
            exit 1
        fi
    done
    
    success "All dependencies are available"
}

# Create backup directory
create_backup_dir() {
    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$backup_date"
    
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Database backup
backup_database() {
    local backup_path="$1"
    local db_backup_file="$backup_path/database.sql.gz"
    
    log "Starting database backup..."
    
    # Create database dump with compression
    mysqldump \
        --host="$MYSQL_HOST" \
        --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "$MYSQL_DATABASE" | gzip > "$db_backup_file"
    
    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        success "Database backup completed: $db_backup_file"
        echo "$db_backup_file"
    else
        error "Database backup failed"
        exit 1
    fi
}

# Redis backup
backup_redis() {
    local backup_path="$1"
    local redis_backup_file="$backup_path/redis.rdb"
    
    log "Starting Redis backup..."
    
    # Save Redis data
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    
    # Wait for background save to complete
    while [[ $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE) -eq $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE) ]]; do
        sleep 1
    done
    
    # Copy the RDB file
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$redis_backup_file"
    
    if [[ -f "$redis_backup_file" ]]; then
        success "Redis backup completed: $redis_backup_file"
        echo "$redis_backup_file"
    else
        error "Redis backup failed"
        exit 1
    fi
}

# File system backup
backup_files() {
    local backup_path="$1"
    local files_backup_file="$backup_path/files.tar.gz"
    
    log "Starting file system backup..."
    
    # Backup application files and user uploads
    tar -czf "$files_backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='vendor' \
        --exclude='.git' \
        --exclude='storage/logs' \
        --exclude='storage/cache' \
        api/storage/app \
        web/dist \
        uploads/ \
        2>/dev/null || true
    
    if [[ -f "$files_backup_file" ]]; then
        success "File system backup completed: $files_backup_file"
        echo "$files_backup_file"
    else
        error "File system backup failed"
        exit 1
    fi
}

# Upload to S3
upload_to_s3() {
    local backup_path="$1"
    local backup_name=$(basename "$backup_path")
    
    log "Uploading backup to S3..."
    
    # Upload entire backup directory to S3
    aws s3 sync "$backup_path" "s3://$S3_BUCKET/$backup_name/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    if [[ $? -eq 0 ]]; then
        success "Backup uploaded to S3: s3://$S3_BUCKET/$backup_name/"
    else
        error "Failed to upload backup to S3"
        exit 1
    fi
}

# Create backup manifest
create_manifest() {
    local backup_path="$1"
    local manifest_file="$backup_path/manifest.json"
    
    cat > "$manifest_file" << EOF
{
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_type": "full",
    "database": {
        "host": "$MYSQL_HOST",
        "database": "$MYSQL_DATABASE",
        "file": "database.sql.gz"
    },
    "redis": {
        "host": "$REDIS_HOST",
        "file": "redis.rdb"
    },
    "files": {
        "file": "files.tar.gz"
    },
    "checksums": {
        "database": "$(md5sum "$backup_path/database.sql.gz" | cut -d' ' -f1)",
        "redis": "$(md5sum "$backup_path/redis.rdb" | cut -d' ' -f1)",
        "files": "$(md5sum "$backup_path/files.tar.gz" | cut -d' ' -f1)"
    }
}
EOF
    
    success "Backup manifest created: $manifest_file"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    # Remove S3 backups older than retention period
    aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --query "Contents[?LastModified<='$(date -d "$RETENTION_DAYS days ago" -u +%Y-%m-%dT%H:%M:%SZ)'].Key" \
        --output text | \
    while read -r key; do
        if [[ -n "$key" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$key"
        fi
    done
    
    success "Old backups cleaned up"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    log "Restoring database from $backup_file..."
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Restore database
    gunzip -c "$backup_file" | mysql \
        --host="$MYSQL_HOST" \
        --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD"
    
    if [[ ${PIPESTATUS[1]} -eq 0 ]]; then
        success "Database restored successfully"
    else
        error "Database restore failed"
        exit 1
    fi
}

# Restore Redis
restore_redis() {
    local backup_file="$1"
    
    log "Restoring Redis from $backup_file..."
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Stop Redis, restore RDB file, and restart
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SHUTDOWN NOSAVE || true
    sleep 2
    
    # Copy backup file to Redis data directory
    cp "$backup_file" /var/lib/redis/dump.rdb
    chown redis:redis /var/lib/redis/dump.rdb
    
    # Start Redis
    systemctl start redis-server
    
    success "Redis restored successfully"
}

# Restore files
restore_files() {
    local backup_file="$1"
    
    log "Restoring files from $backup_file..."
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Extract files
    tar -xzf "$backup_file" -C "$PROJECT_ROOT"
    
    if [[ $? -eq 0 ]]; then
        success "Files restored successfully"
    else
        error "File restore failed"
        exit 1
    fi
}

# Download backup from S3
download_from_s3() {
    local backup_name="$1"
    local local_path="$BACKUP_DIR/$backup_name"
    
    log "Downloading backup from S3..."
    
    mkdir -p "$local_path"
    
    aws s3 sync "s3://$S3_BUCKET/$backup_name/" "$local_path/"
    
    if [[ $? -eq 0 ]]; then
        success "Backup downloaded from S3: $local_path"
        echo "$local_path"
    else
        error "Failed to download backup from S3"
        exit 1
    fi
}

# List available backups
list_backups() {
    log "Available local backups:"
    ls -la "$BACKUP_DIR" 2>/dev/null || echo "No local backups found"
    
    log "Available S3 backups:"
    aws s3 ls "s3://$S3_BUCKET/" --recursive --human-readable --summarize
}

# Main backup function
backup() {
    log "Starting full backup process..."
    
    check_dependencies
    
    local backup_path=$(create_backup_dir)
    
    # Perform backups
    backup_database "$backup_path"
    backup_redis "$backup_path"
    backup_files "$backup_path"
    
    # Create manifest
    create_manifest "$backup_path"
    
    # Upload to S3
    upload_to_s3 "$backup_path"
    
    # Cleanup old backups
    cleanup_old_backups
    
    success "Backup process completed successfully"
    log "Backup location: $backup_path"
}

# Main restore function
restore() {
    local backup_name="$1"
    
    log "Starting restore process for backup: $backup_name"
    
    check_dependencies
    
    # Download backup if not local
    local backup_path="$BACKUP_DIR/$backup_name"
    if [[ ! -d "$backup_path" ]]; then
        backup_path=$(download_from_s3 "$backup_name")
    fi
    
    # Verify manifest
    if [[ ! -f "$backup_path/manifest.json" ]]; then
        error "Backup manifest not found"
        exit 1
    fi
    
    # Restore components
    restore_database "$backup_path/database.sql.gz"
    restore_redis "$backup_path/redis.rdb"
    restore_files "$backup_path/files.tar.gz"
    
    success "Restore process completed successfully"
}

# Usage information
usage() {
    echo "Usage: $0 {backup|restore|list} [backup_name]"
    echo ""
    echo "Commands:"
    echo "  backup          Create a full backup"
    echo "  restore <name>  Restore from backup"
    echo "  list            List available backups"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_DIR      Local backup directory (default: /backups/interviews-tv)"
    echo "  S3_BUCKET       S3 bucket for remote backups (default: interviews-tv-backups)"
    echo "  RETENTION_DAYS  Backup retention period (default: 30)"
    echo "  MYSQL_HOST      MySQL host (default: localhost)"
    echo "  MYSQL_USER      MySQL username (default: root)"
    echo "  MYSQL_PASSWORD  MySQL password (required)"
    echo "  MYSQL_DATABASE  MySQL database (default: interviews_tv)"
    echo "  REDIS_HOST      Redis host (default: localhost)"
}

# Main script logic
case "${1:-}" in
    backup)
        backup
        ;;
    restore)
        if [[ -z "${2:-}" ]]; then
            error "Backup name is required for restore"
            usage
            exit 1
        fi
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    *)
        usage
        exit 1
        ;;
esac
