<?php

namespace App\Controllers;

use App\Services\BackupRestoreService;
use App\Core\Response;

/**
 * Backup and Restore Controller
 * Manages system-level backup and restore operations
 */
class BackupRestoreController extends BaseController
{
    private BackupRestoreService $backupRestoreService;

    public function __construct()
    {
        parent::__construct();
        $this->backupRestoreService = new BackupRestoreService();
    }

    /**
     * Create system backup
     * POST /api/backup/create
     */
    public function createSystemBackup()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin(); // Only admins can create system backups
            
            $options = [
                'include_database' => $_POST['include_database'] ?? true,
                'include_files' => $_POST['include_files'] ?? true,
                'include_redis' => $_POST['include_redis'] ?? true,
                'include_uploads' => $_POST['include_uploads'] ?? true,
                'compression' => $_POST['compression'] ?? 'gzip',
                'upload_to_s3' => $_POST['upload_to_s3'] ?? false,
                'description' => $_POST['description'] ?? 'Manual system backup'
            ];
            
            $result = $this->backupRestoreService->createSystemBackup($options);
            
            return Response::success($result, 'System backup created successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to create system backup: ' . $e->getMessage());
        }
    }

    /**
     * Get backup list
     * GET /api/backup/list
     */
    public function getBackupList()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $includeRemote = $_GET['include_remote'] ?? false;
            $limit = (int)($_GET['limit'] ?? 50);
            
            $backups = $this->backupRestoreService->getBackupList($includeRemote, $limit);
            
            return Response::success($backups);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get backup list: ' . $e->getMessage());
        }
    }

    /**
     * Get backup details
     * GET /api/backup/{backupId}/details
     */
    public function getBackupDetails($backupId)
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $details = $this->backupRestoreService->getBackupDetails($backupId);
            
            if (!$details) {
                return Response::error('Backup not found', 404);
            }
            
            return Response::success($details);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get backup details: ' . $e->getMessage());
        }
    }

    /**
     * Restore from backup
     * POST /api/backup/{backupId}/restore
     */
    public function restoreFromBackup($backupId)
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $options = [
                'restore_database' => $_POST['restore_database'] ?? true,
                'restore_files' => $_POST['restore_files'] ?? true,
                'restore_redis' => $_POST['restore_redis'] ?? true,
                'restore_uploads' => $_POST['restore_uploads'] ?? true,
                'create_backup_before_restore' => $_POST['create_backup_before_restore'] ?? true,
                'force_restore' => $_POST['force_restore'] ?? false
            ];
            
            $result = $this->backupRestoreService->restoreFromBackup($backupId, $options);
            
            return Response::success($result, 'System restored successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to restore from backup: ' . $e->getMessage());
        }
    }

    /**
     * Delete backup
     * DELETE /api/backup/{backupId}
     */
    public function deleteBackup($backupId)
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $deleteRemote = $_POST['delete_remote'] ?? false;
            
            $result = $this->backupRestoreService->deleteBackup($backupId, $deleteRemote);
            
            return Response::success($result, 'Backup deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete backup: ' . $e->getMessage());
        }
    }

    /**
     * Download backup
     * GET /api/backup/{backupId}/download
     */
    public function downloadBackup($backupId)
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $backupPath = $this->backupRestoreService->getBackupPath($backupId);
            
            if (!$backupPath || !file_exists($backupPath)) {
                return Response::error('Backup file not found', 404);
            }
            
            // Set headers for file download
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($backupPath) . '"');
            header('Content-Length: ' . filesize($backupPath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');
            
            // Output file
            readfile($backupPath);
            exit;
            
        } catch (\Exception $e) {
            return Response::error('Failed to download backup: ' . $e->getMessage());
        }
    }

    /**
     * Get backup status
     * GET /api/backup/status
     */
    public function getBackupStatus()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $status = $this->backupRestoreService->getBackupStatus();
            
            return Response::success($status);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get backup status: ' . $e->getMessage());
        }
    }

    /**
     * Verify backup integrity
     * POST /api/backup/{backupId}/verify
     */
    public function verifyBackup($backupId)
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $result = $this->backupRestoreService->verifyBackupIntegrity($backupId);
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Failed to verify backup: ' . $e->getMessage());
        }
    }

    /**
     * Get backup configuration
     * GET /api/backup/config
     */
    public function getBackupConfig()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $config = $this->backupRestoreService->getBackupConfig();
            
            return Response::success($config);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get backup configuration: ' . $e->getMessage());
        }
    }

    /**
     * Update backup configuration
     * PUT /api/backup/config
     */
    public function updateBackupConfig()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $config = [
                'auto_backup_enabled' => $_POST['auto_backup_enabled'] ?? false,
                'backup_schedule' => $_POST['backup_schedule'] ?? 'daily',
                'retention_days' => (int)($_POST['retention_days'] ?? 30),
                's3_enabled' => $_POST['s3_enabled'] ?? false,
                's3_bucket' => $_POST['s3_bucket'] ?? '',
                'compression_enabled' => $_POST['compression_enabled'] ?? true,
                'notification_email' => $_POST['notification_email'] ?? ''
            ];
            
            $result = $this->backupRestoreService->updateBackupConfig($config);
            
            return Response::success($result, 'Backup configuration updated successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to update backup configuration: ' . $e->getMessage());
        }
    }

    /**
     * Schedule backup
     * POST /api/backup/schedule
     */
    public function scheduleBackup()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $schedule = [
                'type' => $_POST['type'] ?? 'full', // full, database, files
                'frequency' => $_POST['frequency'] ?? 'daily', // daily, weekly, monthly
                'time' => $_POST['time'] ?? '02:00', // HH:MM format
                'enabled' => $_POST['enabled'] ?? true,
                'description' => $_POST['description'] ?? 'Scheduled backup'
            ];
            
            $result = $this->backupRestoreService->scheduleBackup($schedule);
            
            return Response::success($result, 'Backup scheduled successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to schedule backup: ' . $e->getMessage());
        }
    }

    /**
     * Get scheduled backups
     * GET /api/backup/scheduled
     */
    public function getScheduledBackups()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $schedules = $this->backupRestoreService->getScheduledBackups();
            
            return Response::success($schedules);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get scheduled backups: ' . $e->getMessage());
        }
    }

    /**
     * Test backup system
     * POST /api/backup/test
     */
    public function testBackupSystem()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $result = $this->backupRestoreService->testBackupSystem();
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Backup system test failed: ' . $e->getMessage());
        }
    }

    /**
     * Get backup statistics
     * GET /api/backup/stats
     */
    public function getBackupStats()
    {
        try {
            $this->requireAuth();
            $this->requireAdmin();
            
            $stats = $this->backupRestoreService->getBackupStatistics();
            
            return Response::success($stats);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get backup statistics: ' . $e->getMessage());
        }
    }

    /**
     * Require admin privileges
     */
    private function requireAdmin()
    {
        $user = $this->getCurrentUser();
        if (!$user || $user['role'] !== 'admin') {
            throw new \Exception('Admin privileges required');
        }
    }
}
