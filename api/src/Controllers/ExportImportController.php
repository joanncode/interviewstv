<?php

namespace App\Controllers;

use App\Services\ExportImportService;
use App\Http\Response;

/**
 * Export/Import Controller
 * Handles comprehensive data export and import operations
 */
class ExportImportController
{
    private $exportImportService;

    public function __construct()
    {
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->exportImportService = new ExportImportService($pdo);
    }

    /**
     * Export user data
     * GET /api/export/user-data
     */
    public function exportUserData()
    {
        try {
            $userId = $this->getCurrentUserId();
            $format = $_GET['format'] ?? 'json';
            $includeMedia = $_GET['include_media'] ?? false;
            $dateRange = $_GET['date_range'] ?? null;
            
            $exportData = $this->exportImportService->exportUserData($userId, [
                'format' => $format,
                'include_media' => $includeMedia,
                'date_range' => $dateRange
            ]);
            
            return $this->downloadResponse($exportData, $format, 'user_data');
            
        } catch (\Exception $e) {
            return Response::error('Failed to export user data: ' . $e->getMessage());
        }
    }

    /**
     * Export interview data
     * GET /api/export/interviews
     */
    public function exportInterviews()
    {
        try {
            $userId = $this->getCurrentUserId();
            $format = $_GET['format'] ?? 'json';
            $interviewIds = $_GET['interview_ids'] ?? null;
            $includeRecordings = $_GET['include_recordings'] ?? false;
            
            $exportData = $this->exportImportService->exportInterviews($userId, [
                'format' => $format,
                'interview_ids' => $interviewIds ? explode(',', $interviewIds) : null,
                'include_recordings' => $includeRecordings
            ]);
            
            return $this->downloadResponse($exportData, $format, 'interviews');
            
        } catch (\Exception $e) {
            return Response::error('Failed to export interviews: ' . $e->getMessage());
        }
    }

    /**
     * Export settings and configurations
     * GET /api/export/settings
     */
    public function exportSettings()
    {
        try {
            $userId = $this->getCurrentUserId();
            $format = $_GET['format'] ?? 'json';
            $includeTemplates = $_GET['include_templates'] ?? true;
            
            $exportData = $this->exportImportService->exportSettings($userId, [
                'format' => $format,
                'include_templates' => $includeTemplates
            ]);
            
            return $this->downloadResponse($exportData, $format, 'settings');
            
        } catch (\Exception $e) {
            return Response::error('Failed to export settings: ' . $e->getMessage());
        }
    }

    /**
     * Export analytics data
     * GET /api/export/analytics
     */
    public function exportAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            $format = $_GET['format'] ?? 'json';
            $timeRange = $_GET['time_range'] ?? '30d';
            $includeCharts = $_GET['include_charts'] ?? false;
            
            $exportData = $this->exportImportService->exportAnalytics($userId, [
                'format' => $format,
                'time_range' => $timeRange,
                'include_charts' => $includeCharts
            ]);
            
            return $this->downloadResponse($exportData, $format, 'analytics');
            
        } catch (\Exception $e) {
            return Response::error('Failed to export analytics: ' . $e->getMessage());
        }
    }

    /**
     * Create full backup
     * POST /api/export/backup
     */
    public function createBackup()
    {
        try {
            $userId = $this->getCurrentUserId();
            $includeMedia = $_POST['include_media'] ?? true;
            $compression = $_POST['compression'] ?? 'zip';
            
            $backupData = $this->exportImportService->createFullBackup($userId, [
                'include_media' => $includeMedia,
                'compression' => $compression
            ]);
            
            return Response::success($backupData, 'Backup created successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to create backup: ' . $e->getMessage());
        }
    }

    /**
     * Import user data
     * POST /api/import/user-data
     */
    public function importUserData()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            if (!isset($_FILES['import_file'])) {
                return Response::error('No import file provided');
            }
            
            $file = $_FILES['import_file'];
            $overwriteExisting = $_POST['overwrite_existing'] ?? false;
            $validateData = $_POST['validate_data'] ?? true;
            
            $result = $this->exportImportService->importUserData($userId, $file, [
                'overwrite_existing' => $overwriteExisting,
                'validate_data' => $validateData
            ]);
            
            return Response::success($result, 'Data imported successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to import data: ' . $e->getMessage());
        }
    }

    /**
     * Import interview data
     * POST /api/import/interviews
     */
    public function importInterviews()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            if (!isset($_FILES['import_file'])) {
                return Response::error('No import file provided');
            }
            
            $file = $_FILES['import_file'];
            $preserveIds = $_POST['preserve_ids'] ?? false;
            $updateExisting = $_POST['update_existing'] ?? false;
            
            $result = $this->exportImportService->importInterviews($userId, $file, [
                'preserve_ids' => $preserveIds,
                'update_existing' => $updateExisting
            ]);
            
            return Response::success($result, 'Interviews imported successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to import interviews: ' . $e->getMessage());
        }
    }

    /**
     * Import settings
     * POST /api/import/settings
     */
    public function importSettings()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            if (!isset($_FILES['import_file'])) {
                return Response::error('No import file provided');
            }
            
            $file = $_FILES['import_file'];
            $mergeWithExisting = $_POST['merge_with_existing'] ?? true;
            
            $result = $this->exportImportService->importSettings($userId, $file, [
                'merge_with_existing' => $mergeWithExisting
            ]);
            
            return Response::success($result, 'Settings imported successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to import settings: ' . $e->getMessage());
        }
    }

    /**
     * Restore from backup
     * POST /api/import/restore
     */
    public function restoreFromBackup()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            if (!isset($_FILES['backup_file'])) {
                return Response::error('No backup file provided');
            }
            
            $file = $_FILES['backup_file'];
            $restoreOptions = [
                'restore_interviews' => $_POST['restore_interviews'] ?? true,
                'restore_settings' => $_POST['restore_settings'] ?? true,
                'restore_analytics' => $_POST['restore_analytics'] ?? false,
                'restore_media' => $_POST['restore_media'] ?? false
            ];
            
            $result = $this->exportImportService->restoreFromBackup($userId, $file, $restoreOptions);
            
            return Response::success($result, 'Backup restored successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to restore backup: ' . $e->getMessage());
        }
    }

    /**
     * Get export/import history
     * GET /api/export/history
     */
    public function getExportImportHistory()
    {
        try {
            $userId = $this->getCurrentUserId();
            $type = $_GET['type'] ?? 'all'; // export, import, backup
            $limit = $_GET['limit'] ?? 50;
            
            $history = $this->exportImportService->getHistory($userId, $type, $limit);
            
            return Response::success($history);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get history: ' . $e->getMessage());
        }
    }

    /**
     * Validate import file
     * POST /api/import/validate
     */
    public function validateImportFile()
    {
        try {
            if (!isset($_FILES['import_file'])) {
                return Response::error('No import file provided');
            }
            
            $file = $_FILES['import_file'];
            $expectedType = $_POST['expected_type'] ?? 'auto';
            
            $validation = $this->exportImportService->validateImportFile($file, $expectedType);
            
            return Response::success($validation);
            
        } catch (\Exception $e) {
            return Response::error('Failed to validate file: ' . $e->getMessage());
        }
    }

    /**
     * Get available export formats
     * GET /api/export/formats
     */
    public function getExportFormats()
    {
        try {
            $formats = $this->exportImportService->getSupportedFormats();
            
            return Response::success($formats);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get formats: ' . $e->getMessage());
        }
    }

    /**
     * Download export file
     * GET /api/export/download/{exportId}
     */
    public function downloadExport($exportId)
    {
        try {
            $userId = $this->getCurrentUserId();
            
            $exportFile = $this->exportImportService->getExportFile($userId, $exportId);
            
            if (!$exportFile) {
                return Response::error('Export file not found', 404);
            }
            
            // Set download headers
            header('Content-Type: ' . $exportFile['mime_type']);
            header('Content-Disposition: attachment; filename="' . $exportFile['filename'] . '"');
            header('Content-Length: ' . $exportFile['size']);
            
            // Output file content
            readfile($exportFile['path']);
            exit;
            
        } catch (\Exception $e) {
            return Response::error('Failed to download export: ' . $e->getMessage());
        }
    }

    /**
     * Create download response
     */
    private function downloadResponse($data, $format, $type)
    {
        $filename = $type . '_export_' . date('Y-m-d_H-i-s') . '.' . $format;
        
        switch ($format) {
            case 'json':
                header('Content-Type: application/json');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                echo json_encode($data, JSON_PRETTY_PRINT);
                break;
                
            case 'csv':
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                echo $data; // Assuming data is already CSV formatted
                break;
                
            case 'xml':
                header('Content-Type: application/xml');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                echo $data; // Assuming data is already XML formatted
                break;
                
            default:
                return Response::error('Unsupported format: ' . $format);
        }
        
        exit;
    }

    /**
     * Schedule export operation
     * POST /api/export/schedule
     */
    public function scheduleExport()
    {
        try {
            $userId = $this->getCurrentUserId();

            $schedule = [
                'export_type' => $_POST['export_type'] ?? 'user-data',
                'format' => $_POST['format'] ?? 'json',
                'frequency' => $_POST['frequency'] ?? 'weekly',
                'time' => $_POST['time'] ?? '02:00',
                'enabled' => $_POST['enabled'] ?? true,
                'options' => [
                    'include_media' => $_POST['include_media'] ?? false,
                    'include_recordings' => $_POST['include_recordings'] ?? false,
                    'compression' => $_POST['compression'] ?? 'gzip'
                ]
            ];

            $result = $this->exportImportService->scheduleExport($userId, $schedule);

            return Response::success($result, 'Export scheduled successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to schedule export: ' . $e->getMessage());
        }
    }

    /**
     * Create export template
     * POST /api/export/template
     */
    public function createExportTemplate()
    {
        try {
            $userId = $this->getCurrentUserId();

            $template = [
                'name' => $_POST['name'] ?? 'Custom Export Template',
                'description' => $_POST['description'] ?? '',
                'export_types' => explode(',', $_POST['export_types'] ?? 'user-data'),
                'format' => $_POST['format'] ?? 'json',
                'is_public' => $_POST['is_public'] ?? false,
                'options' => [
                    'include_media' => $_POST['include_media'] ?? false,
                    'include_recordings' => $_POST['include_recordings'] ?? false,
                    'date_range' => $_POST['date_range'] ?? null,
                    'compression' => $_POST['compression'] ?? 'none'
                ]
            ];

            $result = $this->exportImportService->createExportTemplate($userId, $template);

            return Response::success($result, 'Export template created successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to create export template: ' . $e->getMessage());
        }
    }

    /**
     * Batch export operation
     * POST /api/export/batch
     */
    public function batchExport()
    {
        try {
            $userId = $this->getCurrentUserId();

            $exportJobs = json_decode($_POST['export_jobs'] ?? '[]', true);

            if (empty($exportJobs)) {
                return Response::error('No export jobs specified');
            }

            $result = $this->exportImportService->batchExport($userId, $exportJobs);

            return Response::success($result, 'Batch export completed');

        } catch (\Exception $e) {
            return Response::error('Failed to perform batch export: ' . $e->getMessage());
        }
    }

    /**
     * Advanced import validation
     * POST /api/import/validate-advanced
     */
    public function advancedValidateImport()
    {
        try {
            if (!isset($_FILES['import_file'])) {
                return Response::error('No import file provided');
            }

            $file = $_FILES['import_file'];
            $options = [
                'check_compatibility' => $_POST['check_compatibility'] ?? true,
                'analyze_content' => $_POST['analyze_content'] ?? true,
                'generate_recommendations' => $_POST['generate_recommendations'] ?? true
            ];

            $validation = $this->exportImportService->advancedValidateImport($file, $options);

            return Response::success($validation);

        } catch (\Exception $e) {
            return Response::error('Failed to validate import file: ' . $e->getMessage());
        }
    }

    /**
     * Incremental export
     * GET /api/export/incremental
     */
    public function incrementalExport()
    {
        try {
            $userId = $this->getCurrentUserId();
            $exportType = $_GET['export_type'] ?? 'user-data';
            $format = $_GET['format'] ?? 'json';

            $options = [
                'export_type' => $exportType,
                'format' => $format,
                'include_media' => $_GET['include_media'] ?? false,
                'compression' => $_GET['compression'] ?? 'none'
            ];

            $exportData = $this->exportImportService->incrementalExport($userId, $options);

            return $this->downloadResponse($exportData, $format, 'incremental_' . $exportType);

        } catch (\Exception $e) {
            return Response::error('Failed to perform incremental export: ' . $e->getMessage());
        }
    }

    /**
     * Optimized export for large datasets
     * GET /api/export/optimized
     */
    public function optimizedExport()
    {
        try {
            $userId = $this->getCurrentUserId();

            $options = [
                'format' => $_GET['format'] ?? 'json',
                'compression_level' => (int)($_GET['compression_level'] ?? 6),
                'chunk_size' => (int)($_GET['chunk_size'] ?? 1000),
                'compress' => $_GET['compress'] ?? true,
                'include_media' => $_GET['include_media'] ?? false
            ];

            $exportData = $this->exportImportService->optimizedExport($userId, $options);

            return $this->downloadResponse($exportData, $options['format'], 'optimized_export');

        } catch (\Exception $e) {
            return Response::error('Failed to perform optimized export: ' . $e->getMessage());
        }
    }

    /**
     * Get export performance metrics
     * GET /api/export/metrics
     */
    public function getExportMetrics()
    {
        try {
            $userId = $this->getCurrentUserId();

            $metrics = $this->exportImportService->getExportPerformanceMetrics($userId);

            return Response::success($metrics);

        } catch (\Exception $e) {
            return Response::error('Failed to get export metrics: ' . $e->getMessage());
        }
    }

    /**
     * Get current user ID
     */
    private function getCurrentUserId()
    {
        // TODO: Implement proper authentication check
        return 1; // Demo user ID
    }
}
