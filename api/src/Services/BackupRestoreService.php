<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Backup and Restore Service
 * Integrates with the existing backup-restore.sh script
 */
class BackupRestoreService
{
    private PDO $pdo;
    private array $config;
    private string $backupDir;
    private string $scriptPath;
    private string $projectRoot;

    public function __construct(PDO $pdo = null, array $config = [])
    {
        $this->pdo = $pdo ?: $this->getDefaultPDO();
        $this->config = array_merge([
            'backup_dir' => '/backups/interviews-tv',
            's3_bucket' => 'interviews-tv-backups',
            'retention_days' => 30,
            'max_backup_size' => '10G',
            'compression_level' => 6,
            'notification_email' => '',
            'auto_backup_enabled' => false,
            'backup_schedule' => 'daily'
        ], $config);
        
        $this->projectRoot = dirname(dirname(dirname(__DIR__)));
        $this->scriptPath = $this->projectRoot . '/scripts/backup-restore.sh';
        $this->backupDir = $this->config['backup_dir'];
        
        $this->ensureBackupDirectory();
    }

    /**
     * Create system backup
     */
    public function createSystemBackup(array $options = []): array
    {
        $backupId = 'backup_' . date('Y-m-d_H-i-s') . '_' . uniqid();
        
        // Prepare environment variables
        $env = $this->prepareEnvironment($options);
        
        // Execute backup script
        $command = "cd {$this->projectRoot} && {$this->scriptPath} backup";
        $output = [];
        $returnCode = 0;
        
        exec($command . ' 2>&1', $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new Exception('Backup failed: ' . implode("\n", $output));
        }
        
        // Parse backup output to get backup path
        $backupPath = $this->parseBackupOutput($output);
        
        // Create backup record
        $backupRecord = [
            'id' => $backupId,
            'path' => $backupPath,
            'size' => $this->getBackupSize($backupPath),
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'system',
            'status' => 'completed',
            'description' => $options['description'] ?? 'System backup',
            'options' => json_encode($options),
            'output' => implode("\n", $output)
        ];
        
        $this->saveBackupRecord($backupRecord);
        
        return $backupRecord;
    }

    /**
     * Get backup list
     */
    public function getBackupList(bool $includeRemote = false, int $limit = 50): array
    {
        $backups = [];
        
        // Get local backups
        $localBackups = $this->getLocalBackups($limit);
        $backups = array_merge($backups, $localBackups);
        
        // Get remote backups if requested
        if ($includeRemote) {
            $remoteBackups = $this->getRemoteBackups($limit);
            $backups = array_merge($backups, $remoteBackups);
        }
        
        // Sort by creation date (newest first)
        usort($backups, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        return array_slice($backups, 0, $limit);
    }

    /**
     * Get backup details
     */
    public function getBackupDetails(string $backupId): ?array
    {
        // Try to get from database first
        $stmt = $this->pdo->prepare("SELECT * FROM backup_records WHERE id = ?");
        $stmt->execute([$backupId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($record) {
            $record['options'] = json_decode($record['options'], true);
            $record['manifest'] = $this->getBackupManifest($record['path']);
            $record['integrity'] = $this->checkBackupIntegrity($record['path']);
            return $record;
        }
        
        // Try to find backup by scanning directories
        return $this->scanForBackup($backupId);
    }

    /**
     * Restore from backup
     */
    public function restoreFromBackup(string $backupId, array $options = []): array
    {
        $backup = $this->getBackupDetails($backupId);
        
        if (!$backup) {
            throw new Exception('Backup not found: ' . $backupId);
        }
        
        // Create backup before restore if requested
        if ($options['create_backup_before_restore'] ?? true) {
            $preRestoreBackup = $this->createSystemBackup([
                'description' => 'Pre-restore backup for ' . $backupId
            ]);
        }
        
        // Prepare restore command
        $backupName = basename($backup['path']);
        $command = "cd {$this->projectRoot} && {$this->scriptPath} restore {$backupName}";
        
        $output = [];
        $returnCode = 0;
        
        exec($command . ' 2>&1', $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new Exception('Restore failed: ' . implode("\n", $output));
        }
        
        // Log restore operation
        $this->logRestoreOperation($backupId, $options, $output);
        
        return [
            'backup_id' => $backupId,
            'restored_at' => date('Y-m-d H:i:s'),
            'pre_restore_backup' => $preRestoreBackup ?? null,
            'output' => implode("\n", $output)
        ];
    }

    /**
     * Delete backup
     */
    public function deleteBackup(string $backupId, bool $deleteRemote = false): array
    {
        $backup = $this->getBackupDetails($backupId);
        
        if (!$backup) {
            throw new Exception('Backup not found: ' . $backupId);
        }
        
        $deleted = [];
        
        // Delete local backup
        if (file_exists($backup['path'])) {
            if (is_dir($backup['path'])) {
                $this->removeDirectory($backup['path']);
            } else {
                unlink($backup['path']);
            }
            $deleted['local'] = true;
        }
        
        // Delete remote backup if requested
        if ($deleteRemote) {
            $deleted['remote'] = $this->deleteRemoteBackup($backupId);
        }
        
        // Remove from database
        $stmt = $this->pdo->prepare("DELETE FROM backup_records WHERE id = ?");
        $stmt->execute([$backupId]);
        $deleted['database'] = true;
        
        return $deleted;
    }

    /**
     * Get backup path
     */
    public function getBackupPath(string $backupId): ?string
    {
        $backup = $this->getBackupDetails($backupId);
        return $backup ? $backup['path'] : null;
    }

    /**
     * Get backup status
     */
    public function getBackupStatus(): array
    {
        return [
            'backup_dir' => $this->backupDir,
            'backup_dir_exists' => is_dir($this->backupDir),
            'backup_dir_writable' => is_writable($this->backupDir),
            'script_exists' => file_exists($this->scriptPath),
            'script_executable' => is_executable($this->scriptPath),
            'disk_space' => $this->getDiskSpace(),
            'last_backup' => $this->getLastBackupInfo(),
            'backup_count' => $this->getBackupCount(),
            'total_backup_size' => $this->getTotalBackupSize(),
            'config' => $this->config
        ];
    }

    /**
     * Verify backup integrity
     */
    public function verifyBackupIntegrity(string $backupId): array
    {
        $backup = $this->getBackupDetails($backupId);
        
        if (!$backup) {
            throw new Exception('Backup not found: ' . $backupId);
        }
        
        $results = [
            'backup_id' => $backupId,
            'verified_at' => date('Y-m-d H:i:s'),
            'checks' => []
        ];
        
        // Check if backup path exists
        $results['checks']['path_exists'] = [
            'status' => file_exists($backup['path']),
            'message' => file_exists($backup['path']) ? 'Backup path exists' : 'Backup path not found'
        ];
        
        // Check manifest file
        $manifestPath = $backup['path'] . '/manifest.json';
        $results['checks']['manifest_exists'] = [
            'status' => file_exists($manifestPath),
            'message' => file_exists($manifestPath) ? 'Manifest file exists' : 'Manifest file missing'
        ];
        
        // Verify file checksums if manifest exists
        if (file_exists($manifestPath)) {
            $manifest = json_decode(file_get_contents($manifestPath), true);
            $results['checks']['checksums'] = $this->verifyChecksums($backup['path'], $manifest);
        }
        
        // Check backup size
        $actualSize = $this->getBackupSize($backup['path']);
        $results['checks']['size_check'] = [
            'status' => $actualSize > 0,
            'message' => "Backup size: " . $this->formatBytes($actualSize),
            'size' => $actualSize
        ];
        
        $results['overall_status'] = $this->calculateOverallStatus($results['checks']);
        
        return $results;
    }

    /**
     * Get backup configuration
     */
    public function getBackupConfig(): array
    {
        return $this->config;
    }

    /**
     * Update backup configuration
     */
    public function updateBackupConfig(array $config): array
    {
        $this->config = array_merge($this->config, $config);
        
        // Save configuration to file
        $configPath = $this->projectRoot . '/config/backup.json';
        file_put_contents($configPath, json_encode($this->config, JSON_PRETTY_PRINT));
        
        return $this->config;
    }

    /**
     * Schedule backup
     */
    public function scheduleBackup(array $schedule): array
    {
        // Create cron job entry
        $cronEntry = $this->createCronEntry($schedule);
        
        // Save schedule to database
        $stmt = $this->pdo->prepare("
            INSERT INTO backup_schedules (type, frequency, time, enabled, description, cron_entry, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $schedule['type'],
            $schedule['frequency'],
            $schedule['time'],
            $schedule['enabled'] ? 1 : 0,
            $schedule['description'],
            $cronEntry,
            date('Y-m-d H:i:s')
        ]);
        
        $scheduleId = $this->pdo->lastInsertId();
        
        // Update system crontab if enabled
        if ($schedule['enabled']) {
            $this->updateCrontab();
        }
        
        return [
            'id' => $scheduleId,
            'cron_entry' => $cronEntry,
            'schedule' => $schedule
        ];
    }

    /**
     * Get scheduled backups
     */
    public function getScheduledBackups(): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM backup_schedules ORDER BY created_at DESC");
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Test backup system
     */
    public function testBackupSystem(): array
    {
        $tests = [];
        
        // Test script existence and permissions
        $tests['script_check'] = [
            'name' => 'Backup Script Check',
            'status' => file_exists($this->scriptPath) && is_executable($this->scriptPath),
            'message' => file_exists($this->scriptPath) ? 
                (is_executable($this->scriptPath) ? 'Script exists and is executable' : 'Script exists but not executable') :
                'Backup script not found'
        ];
        
        // Test backup directory
        $tests['directory_check'] = [
            'name' => 'Backup Directory Check',
            'status' => is_dir($this->backupDir) && is_writable($this->backupDir),
            'message' => is_dir($this->backupDir) ?
                (is_writable($this->backupDir) ? 'Directory exists and is writable' : 'Directory exists but not writable') :
                'Backup directory does not exist'
        ];
        
        // Test disk space
        $freeSpace = disk_free_space($this->backupDir);
        $tests['disk_space_check'] = [
            'name' => 'Disk Space Check',
            'status' => $freeSpace > (1024 * 1024 * 1024), // At least 1GB free
            'message' => 'Free space: ' . $this->formatBytes($freeSpace)
        ];
        
        // Test database connection
        $tests['database_check'] = [
            'name' => 'Database Connection Check',
            'status' => $this->testDatabaseConnection(),
            'message' => $this->testDatabaseConnection() ? 'Database connection successful' : 'Database connection failed'
        ];
        
        // Test S3 connection if enabled
        if ($this->config['s3_enabled'] ?? false) {
            $tests['s3_check'] = [
                'name' => 'S3 Connection Check',
                'status' => $this->testS3Connection(),
                'message' => $this->testS3Connection() ? 'S3 connection successful' : 'S3 connection failed'
            ];
        }
        
        $overallStatus = array_reduce($tests, function($carry, $test) {
            return $carry && $test['status'];
        }, true);
        
        return [
            'overall_status' => $overallStatus,
            'tests' => $tests,
            'tested_at' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Get backup statistics
     */
    public function getBackupStatistics(): array
    {
        $stats = [
            'total_backups' => $this->getBackupCount(),
            'total_size' => $this->getTotalBackupSize(),
            'oldest_backup' => $this->getOldestBackupDate(),
            'newest_backup' => $this->getNewestBackupDate(),
            'average_size' => $this->getAverageBackupSize(),
            'backup_frequency' => $this->getBackupFrequency(),
            'success_rate' => $this->getBackupSuccessRate(),
            'storage_usage' => $this->getStorageUsage()
        ];
        
        return $stats;
    }

    /**
     * Prepare environment variables for backup script
     */
    private function prepareEnvironment(array $options): array
    {
        $env = [
            'BACKUP_DIR' => $this->backupDir,
            'S3_BUCKET' => $this->config['s3_bucket'],
            'RETENTION_DAYS' => $this->config['retention_days']
        ];
        
        // Add database credentials if available
        if (isset($this->config['mysql_host'])) {
            $env['MYSQL_HOST'] = $this->config['mysql_host'];
            $env['MYSQL_USER'] = $this->config['mysql_user'];
            $env['MYSQL_PASSWORD'] = $this->config['mysql_password'];
            $env['MYSQL_DATABASE'] = $this->config['mysql_database'];
        }
        
        return $env;
    }

    /**
     * Parse backup script output to extract backup path
     */
    private function parseBackupOutput(array $output): string
    {
        foreach ($output as $line) {
            if (strpos($line, 'Backup location:') !== false) {
                return trim(str_replace('Backup location:', '', $line));
            }
        }
        
        // Fallback: return latest backup directory
        return $this->getLatestBackupPath();
    }

    /**
     * Get latest backup path
     */
    private function getLatestBackupPath(): string
    {
        $backups = glob($this->backupDir . '/backup_*');
        if (empty($backups)) {
            throw new Exception('No backup found');
        }
        
        usort($backups, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        return $backups[0];
    }

    /**
     * Get backup size
     */
    private function getBackupSize(string $path): int
    {
        if (is_file($path)) {
            return filesize($path);
        } elseif (is_dir($path)) {
            return $this->getDirectorySize($path);
        }
        
        return 0;
    }

    /**
     * Get directory size recursively
     */
    private function getDirectorySize(string $directory): int
    {
        $size = 0;
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory));
        
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }
        
        return $size;
    }

    /**
     * Save backup record to database
     */
    private function saveBackupRecord(array $record): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO backup_records (id, path, size, created_at, type, status, description, options, output)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $record['id'],
            $record['path'],
            $record['size'],
            $record['created_at'],
            $record['type'],
            $record['status'],
            $record['description'],
            $record['options'],
            $record['output']
        ]);
    }

    /**
     * Get local backups
     */
    private function getLocalBackups(int $limit): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM backup_records 
            WHERE type = 'system' 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get remote backups from S3
     */
    private function getRemoteBackups(int $limit): array
    {
        // This would integrate with AWS S3 API
        // For now, return empty array
        return [];
    }

    /**
     * Ensure backup directory exists
     */
    private function ensureBackupDirectory(): void
    {
        if (!is_dir($this->backupDir)) {
            mkdir($this->backupDir, 0755, true);
        }
    }

    /**
     * Get default PDO connection
     */
    private function getDefaultPDO(): PDO
    {
        // This would use the application's database configuration
        // For now, return a mock PDO
        return new PDO('sqlite::memory:');
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    // Additional helper methods would be implemented here...
    // getBackupCount, getTotalBackupSize, getDiskSpace, etc.
}
