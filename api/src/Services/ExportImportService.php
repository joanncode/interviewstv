<?php

namespace App\Services;

use PDO;
use Exception;
use ZipArchive;

/**
 * Export/Import Service
 * Comprehensive data export and import functionality
 */
class ExportImportService
{
    private PDO $pdo;
    private array $config;
    private string $exportPath;
    private string $tempPath;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'max_file_size' => 100 * 1024 * 1024, // 100MB
            'supported_formats' => ['json', 'csv', 'xml', 'zip'],
            'export_retention_days' => 7,
            'compression_level' => 6,
            'include_metadata' => true,
            'validate_imports' => true,
            'backup_before_import' => true
        ], $config);
        
        $this->exportPath = __DIR__ . '/../../storage/exports';
        $this->tempPath = __DIR__ . '/../../storage/temp';
        
        $this->ensureDirectories();
    }

    /**
     * Export user data
     */
    public function exportUserData(int $userId, array $options = []): array
    {
        $format = $options['format'] ?? 'json';
        $includeMedia = $options['include_media'] ?? false;
        $dateRange = $options['date_range'] ?? null;
        
        // Collect user data
        $userData = [
            'user_profile' => $this->getUserProfile($userId),
            'interviews' => $this->getUserInterviews($userId, $dateRange),
            'templates' => $this->getUserTemplates($userId),
            'settings' => $this->getUserSettings($userId),
            'analytics' => $this->getUserAnalytics($userId, $dateRange)
        ];
        
        if ($includeMedia) {
            $userData['media_files'] = $this->getUserMediaFiles($userId);
        }
        
        // Add metadata
        if ($this->config['include_metadata']) {
            $userData['_metadata'] = [
                'export_date' => date('Y-m-d H:i:s'),
                'export_version' => '1.0',
                'user_id' => $userId,
                'format' => $format,
                'options' => $options
            ];
        }
        
        return $this->formatExportData($userData, $format);
    }

    /**
     * Export interviews
     */
    public function exportInterviews(int $userId, array $options = []): array
    {
        $format = $options['format'] ?? 'json';
        $interviewIds = $options['interview_ids'] ?? null;
        $includeRecordings = $options['include_recordings'] ?? false;
        
        $interviews = $this->getUserInterviews($userId, null, $interviewIds);
        
        if ($includeRecordings) {
            foreach ($interviews as &$interview) {
                $interview['recordings'] = $this->getInterviewRecordings($interview['id']);
            }
        }
        
        $exportData = [
            'interviews' => $interviews,
            '_metadata' => [
                'export_date' => date('Y-m-d H:i:s'),
                'export_type' => 'interviews',
                'user_id' => $userId,
                'count' => count($interviews)
            ]
        ];
        
        return $this->formatExportData($exportData, $format);
    }

    /**
     * Export settings and configurations
     */
    public function exportSettings(int $userId, array $options = []): array
    {
        $format = $options['format'] ?? 'json';
        $includeTemplates = $options['include_templates'] ?? true;
        
        $settings = [
            'user_settings' => $this->getUserSettings($userId),
            'preferences' => $this->getUserPreferences($userId),
            'privacy_settings' => $this->getPrivacySettings($userId)
        ];
        
        if ($includeTemplates) {
            $settings['interview_templates'] = $this->getUserTemplates($userId);
        }
        
        $exportData = [
            'settings' => $settings,
            '_metadata' => [
                'export_date' => date('Y-m-d H:i:s'),
                'export_type' => 'settings',
                'user_id' => $userId
            ]
        ];
        
        return $this->formatExportData($exportData, $format);
    }

    /**
     * Export analytics data
     */
    public function exportAnalytics(int $userId, array $options = []): array
    {
        $format = $options['format'] ?? 'json';
        $timeRange = $options['time_range'] ?? '30d';
        $includeCharts = $options['include_charts'] ?? false;
        
        $analytics = [
            'overview_metrics' => $this->getAnalyticsOverview($userId, $timeRange),
            'engagement_data' => $this->getEngagementData($userId, $timeRange),
            'audience_insights' => $this->getAudienceInsights($userId, $timeRange),
            'performance_metrics' => $this->getPerformanceMetrics($userId, $timeRange)
        ];
        
        if ($includeCharts) {
            $analytics['chart_data'] = $this->getChartData($userId, $timeRange);
        }
        
        $exportData = [
            'analytics' => $analytics,
            '_metadata' => [
                'export_date' => date('Y-m-d H:i:s'),
                'export_type' => 'analytics',
                'user_id' => $userId,
                'time_range' => $timeRange
            ]
        ];
        
        return $this->formatExportData($exportData, $format);
    }

    /**
     * Create full backup
     */
    public function createFullBackup(int $userId, array $options = []): array
    {
        $includeMedia = $options['include_media'] ?? true;
        $compression = $options['compression'] ?? 'zip';
        
        $backupId = 'backup_' . $userId . '_' . time();
        $backupDir = $this->exportPath . '/' . $backupId;
        
        if (!mkdir($backupDir, 0755, true)) {
            throw new Exception('Failed to create backup directory');
        }
        
        // Export all data types
        $userData = $this->exportUserData($userId, ['format' => 'json', 'include_media' => false]);
        $interviews = $this->exportInterviews($userId, ['format' => 'json', 'include_recordings' => true]);
        $settings = $this->exportSettings($userId, ['format' => 'json']);
        $analytics = $this->exportAnalytics($userId, ['format' => 'json']);
        
        // Save individual files
        file_put_contents($backupDir . '/user_data.json', json_encode($userData, JSON_PRETTY_PRINT));
        file_put_contents($backupDir . '/interviews.json', json_encode($interviews, JSON_PRETTY_PRINT));
        file_put_contents($backupDir . '/settings.json', json_encode($settings, JSON_PRETTY_PRINT));
        file_put_contents($backupDir . '/analytics.json', json_encode($analytics, JSON_PRETTY_PRINT));
        
        // Copy media files if requested
        if ($includeMedia) {
            $this->copyUserMediaFiles($userId, $backupDir . '/media');
        }
        
        // Create backup manifest
        $manifest = [
            'backup_id' => $backupId,
            'user_id' => $userId,
            'created_at' => date('Y-m-d H:i:s'),
            'version' => '1.0',
            'includes_media' => $includeMedia,
            'files' => [
                'user_data.json',
                'interviews.json',
                'settings.json',
                'analytics.json'
            ]
        ];
        
        if ($includeMedia) {
            $manifest['files'][] = 'media/';
        }
        
        file_put_contents($backupDir . '/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        
        // Compress if requested
        if ($compression === 'zip') {
            $zipFile = $this->exportPath . '/' . $backupId . '.zip';
            $this->createZipArchive($backupDir, $zipFile);
            
            // Remove uncompressed directory
            $this->removeDirectory($backupDir);
            
            return [
                'backup_id' => $backupId,
                'file_path' => $zipFile,
                'file_size' => filesize($zipFile),
                'compressed' => true
            ];
        }
        
        return [
            'backup_id' => $backupId,
            'directory_path' => $backupDir,
            'compressed' => false
        ];
    }

    /**
     * Import user data
     */
    public function importUserData(int $userId, array $file, array $options = []): array
    {
        $overwriteExisting = $options['overwrite_existing'] ?? false;
        $validateData = $options['validate_data'] ?? true;
        
        // Validate file
        if ($validateData) {
            $validation = $this->validateImportFile($file, 'user_data');
            if (!$validation['valid']) {
                throw new Exception('Invalid import file: ' . implode(', ', $validation['errors']));
            }
        }
        
        // Read and parse file
        $data = $this->parseImportFile($file);
        
        // Backup existing data if requested
        if ($this->config['backup_before_import']) {
            $this->createFullBackup($userId, ['compression' => 'zip']);
        }
        
        $imported = [
            'user_profile' => 0,
            'interviews' => 0,
            'templates' => 0,
            'settings' => 0
        ];
        
        // Import user profile
        if (isset($data['user_profile'])) {
            $this->importUserProfile($userId, $data['user_profile'], $overwriteExisting);
            $imported['user_profile'] = 1;
        }
        
        // Import interviews
        if (isset($data['interviews'])) {
            $imported['interviews'] = $this->importUserInterviews($userId, $data['interviews'], $overwriteExisting);
        }
        
        // Import templates
        if (isset($data['templates'])) {
            $imported['templates'] = $this->importUserTemplates($userId, $data['templates'], $overwriteExisting);
        }
        
        // Import settings
        if (isset($data['settings'])) {
            $this->importUserSettings($userId, $data['settings'], $overwriteExisting);
            $imported['settings'] = 1;
        }
        
        return $imported;
    }

    /**
     * Import interviews
     */
    public function importInterviews(int $userId, array $file, array $options = []): array
    {
        $preserveIds = $options['preserve_ids'] ?? false;
        $updateExisting = $options['update_existing'] ?? false;
        
        $data = $this->parseImportFile($file);
        
        if (!isset($data['interviews'])) {
            throw new Exception('No interviews data found in import file');
        }
        
        return [
            'imported' => $this->importUserInterviews($userId, $data['interviews'], $updateExisting, $preserveIds),
            'total' => count($data['interviews'])
        ];
    }

    /**
     * Import settings
     */
    public function importSettings(int $userId, array $file, array $options = []): array
    {
        $mergeWithExisting = $options['merge_with_existing'] ?? true;
        
        $data = $this->parseImportFile($file);
        
        if (!isset($data['settings'])) {
            throw new Exception('No settings data found in import file');
        }
        
        $this->importUserSettings($userId, $data['settings'], !$mergeWithExisting);
        
        return ['imported' => true];
    }

    /**
     * Restore from backup
     */
    public function restoreFromBackup(int $userId, array $file, array $options = []): array
    {
        $restoreOptions = array_merge([
            'restore_interviews' => true,
            'restore_settings' => true,
            'restore_analytics' => false,
            'restore_media' => false
        ], $options);
        
        // Extract backup if it's a zip file
        $backupDir = $this->extractBackupFile($file);
        
        // Validate backup manifest
        $manifest = $this->validateBackupManifest($backupDir);
        
        $restored = [];
        
        // Restore interviews
        if ($restoreOptions['restore_interviews'] && file_exists($backupDir . '/interviews.json')) {
            $interviewsData = json_decode(file_get_contents($backupDir . '/interviews.json'), true);
            $restored['interviews'] = $this->importUserInterviews($userId, $interviewsData['interviews'], true);
        }
        
        // Restore settings
        if ($restoreOptions['restore_settings'] && file_exists($backupDir . '/settings.json')) {
            $settingsData = json_decode(file_get_contents($backupDir . '/settings.json'), true);
            $this->importUserSettings($userId, $settingsData['settings'], true);
            $restored['settings'] = true;
        }
        
        // Restore media files
        if ($restoreOptions['restore_media'] && is_dir($backupDir . '/media')) {
            $this->restoreUserMediaFiles($userId, $backupDir . '/media');
            $restored['media'] = true;
        }
        
        // Cleanup temporary files
        $this->removeDirectory($backupDir);
        
        return $restored;
    }

    /**
     * Get export/import history
     */
    public function getHistory(int $userId, string $type = 'all', int $limit = 50): array
    {
        $whereClause = 'WHERE user_id = ?';
        $params = [$userId];
        
        if ($type !== 'all') {
            $whereClause .= ' AND operation_type = ?';
            $params[] = $type;
        }
        
        $stmt = $this->pdo->prepare("
            SELECT * FROM export_import_history 
            {$whereClause}
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        
        $params[] = $limit;
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Validate import file
     */
    public function validateImportFile(array $file, string $expectedType = 'auto'): array
    {
        $errors = [];
        
        // Check file size
        if ($file['size'] > $this->config['max_file_size']) {
            $errors[] = 'File size exceeds maximum allowed size';
        }
        
        // Check file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->config['supported_formats'])) {
            $errors[] = 'Unsupported file format';
        }
        
        // Validate file content
        try {
            $content = file_get_contents($file['tmp_name']);
            
            if ($extension === 'json') {
                $data = json_decode($content, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $errors[] = 'Invalid JSON format';
                }
            }
            
        } catch (Exception $e) {
            $errors[] = 'Failed to read file content';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'file_info' => [
                'name' => $file['name'],
                'size' => $file['size'],
                'type' => $file['type'],
                'extension' => $extension
            ]
        ];
    }

    /**
     * Get supported formats
     */
    public function getSupportedFormats(): array
    {
        return [
            'json' => [
                'name' => 'JSON',
                'description' => 'JavaScript Object Notation',
                'mime_type' => 'application/json',
                'supports_import' => true,
                'supports_export' => true
            ],
            'csv' => [
                'name' => 'CSV',
                'description' => 'Comma Separated Values',
                'mime_type' => 'text/csv',
                'supports_import' => true,
                'supports_export' => true
            ],
            'xml' => [
                'name' => 'XML',
                'description' => 'Extensible Markup Language',
                'mime_type' => 'application/xml',
                'supports_import' => false,
                'supports_export' => true
            ],
            'zip' => [
                'name' => 'ZIP',
                'description' => 'Compressed Archive',
                'mime_type' => 'application/zip',
                'supports_import' => true,
                'supports_export' => true
            ]
        ];
    }

    /**
     * Get export file
     */
    public function getExportFile(int $userId, string $exportId): ?array
    {
        // Implementation would retrieve export file information
        // This is a placeholder
        return null;
    }

    /**
     * Format export data
     */
    private function formatExportData(array $data, string $format): array
    {
        switch ($format) {
            case 'json':
                return $data;
                
            case 'csv':
                return $this->convertToCSV($data);
                
            case 'xml':
                return $this->convertToXML($data);
                
            default:
                throw new Exception('Unsupported export format: ' . $format);
        }
    }

    /**
     * Parse import file
     */
    private function parseImportFile(array $file): array
    {
        $content = file_get_contents($file['tmp_name']);
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        switch ($extension) {
            case 'json':
                return json_decode($content, true);
                
            case 'csv':
                return $this->parseCSV($content);
                
            case 'zip':
                return $this->parseZipFile($file['tmp_name']);
                
            default:
                throw new Exception('Unsupported import format: ' . $extension);
        }
    }

    /**
     * Ensure required directories exist
     */
    private function ensureDirectories(): void
    {
        $directories = [$this->exportPath, $this->tempPath];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    /**
     * Schedule export operation
     */
    public function scheduleExport(int $userId, array $schedule): array
    {
        $scheduleId = 'export_schedule_' . time() . '_' . uniqid();

        $scheduleData = [
            'id' => $scheduleId,
            'user_id' => $userId,
            'export_type' => $schedule['export_type'] ?? 'user-data',
            'format' => $schedule['format'] ?? 'json',
            'frequency' => $schedule['frequency'] ?? 'weekly', // daily, weekly, monthly
            'time' => $schedule['time'] ?? '02:00',
            'options' => json_encode($schedule['options'] ?? []),
            'enabled' => $schedule['enabled'] ?? true,
            'next_run' => $this->calculateNextRun($schedule['frequency'], $schedule['time']),
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->saveExportSchedule($scheduleData);

        return $scheduleData;
    }

    /**
     * Create export template
     */
    public function createExportTemplate(int $userId, array $template): array
    {
        $templateId = 'export_template_' . time() . '_' . uniqid();

        $templateData = [
            'id' => $templateId,
            'user_id' => $userId,
            'name' => $template['name'],
            'description' => $template['description'] ?? '',
            'export_types' => json_encode($template['export_types'] ?? []),
            'format' => $template['format'] ?? 'json',
            'options' => json_encode($template['options'] ?? []),
            'is_public' => $template['is_public'] ?? false,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->saveExportTemplate($templateData);

        return $templateData;
    }

    /**
     * Batch export multiple data types
     */
    public function batchExport(int $userId, array $exportJobs): array
    {
        $batchId = 'batch_export_' . time() . '_' . uniqid();
        $results = [];

        foreach ($exportJobs as $job) {
            try {
                $exportData = $this->performExport($userId, $job);
                $results[] = [
                    'job_id' => $job['id'] ?? uniqid(),
                    'type' => $job['type'],
                    'status' => 'completed',
                    'data' => $exportData,
                    'size' => strlen(json_encode($exportData))
                ];
            } catch (Exception $e) {
                $results[] = [
                    'job_id' => $job['id'] ?? uniqid(),
                    'type' => $job['type'],
                    'status' => 'failed',
                    'error' => $e->getMessage()
                ];
            }
        }

        // Save batch export record
        $this->saveBatchExportRecord($batchId, $userId, $results);

        return [
            'batch_id' => $batchId,
            'total_jobs' => count($exportJobs),
            'successful' => count(array_filter($results, fn($r) => $r['status'] === 'completed')),
            'failed' => count(array_filter($results, fn($r) => $r['status'] === 'failed')),
            'results' => $results
        ];
    }

    /**
     * Advanced import validation with detailed analysis
     */
    public function advancedValidateImport(array $file, array $options = []): array
    {
        $validation = [
            'file_validation' => $this->validateImportFile($file),
            'content_analysis' => [],
            'compatibility_check' => [],
            'recommendations' => []
        ];

        if ($validation['file_validation']['valid']) {
            $data = $this->parseImportFile($file);

            // Analyze content structure
            $validation['content_analysis'] = $this->analyzeImportContent($data);

            // Check compatibility with current system
            $validation['compatibility_check'] = $this->checkImportCompatibility($data);

            // Generate recommendations
            $validation['recommendations'] = $this->generateImportRecommendations($data, $validation);
        }

        return $validation;
    }

    /**
     * Incremental export (only changes since last export)
     */
    public function incrementalExport(int $userId, array $options = []): array
    {
        $lastExportTime = $this->getLastExportTime($userId, $options['export_type'] ?? 'user-data');

        if (!$lastExportTime) {
            // First export, do full export
            return $this->exportUserData($userId, $options);
        }

        // Export only changes since last export
        $options['since_date'] = $lastExportTime;
        $options['incremental'] = true;

        $exportData = $this->exportUserData($userId, $options);

        // Update last export time
        $this->updateLastExportTime($userId, $options['export_type'] ?? 'user-data');

        return $exportData;
    }

    /**
     * Export with compression optimization
     */
    public function optimizedExport(int $userId, array $options = []): array
    {
        $compressionLevel = $options['compression_level'] ?? 6;
        $chunkSize = $options['chunk_size'] ?? 1000; // Records per chunk

        // Export in chunks for large datasets
        $exportData = $this->exportInChunks($userId, $options, $chunkSize);

        // Apply compression
        if ($options['compress'] ?? true) {
            $exportData = $this->compressExportData($exportData, $compressionLevel);
        }

        return $exportData;
    }

    /**
     * Export performance monitoring
     */
    public function getExportPerformanceMetrics(int $userId): array
    {
        return [
            'total_exports' => $this->getTotalExports($userId),
            'average_export_time' => $this->getAverageExportTime($userId),
            'largest_export_size' => $this->getLargestExportSize($userId),
            'most_exported_type' => $this->getMostExportedType($userId),
            'export_frequency' => $this->getExportFrequency($userId),
            'storage_usage' => $this->getExportStorageUsage($userId)
        ];
    }

    // Helper methods for new functionality

    private function performExport(int $userId, array $job): array
    {
        switch ($job['type']) {
            case 'user-data':
                return $this->exportUserData($userId, $job['options'] ?? []);
            case 'interviews':
                return $this->exportInterviews($userId, $job['options'] ?? []);
            case 'settings':
                return $this->exportSettings($userId, $job['options'] ?? []);
            case 'analytics':
                return $this->exportAnalytics($userId, $job['options'] ?? []);
            default:
                throw new Exception('Unknown export type: ' . $job['type']);
        }
    }

    private function calculateNextRun(string $frequency, string $time): string
    {
        $now = new \DateTime();
        $nextRun = clone $now;

        switch ($frequency) {
            case 'daily':
                $nextRun->modify('+1 day');
                break;
            case 'weekly':
                $nextRun->modify('+1 week');
                break;
            case 'monthly':
                $nextRun->modify('+1 month');
                break;
        }

        list($hour, $minute) = explode(':', $time);
        $nextRun->setTime((int)$hour, (int)$minute);

        return $nextRun->format('Y-m-d H:i:s');
    }

    private function analyzeImportContent(array $data): array
    {
        return [
            'total_records' => $this->countRecords($data),
            'data_types' => $this->identifyDataTypes($data),
            'size_estimate' => strlen(json_encode($data)),
            'structure_analysis' => $this->analyzeDataStructure($data),
            'potential_issues' => $this->identifyPotentialIssues($data)
        ];
    }

    private function checkImportCompatibility(array $data): array
    {
        return [
            'version_compatible' => $this->checkVersionCompatibility($data),
            'schema_compatible' => $this->checkSchemaCompatibility($data),
            'data_format_supported' => $this->checkDataFormatSupport($data),
            'missing_dependencies' => $this->checkMissingDependencies($data)
        ];
    }

    private function generateImportRecommendations(array $data, array $validation): array
    {
        $recommendations = [];

        if (!$validation['compatibility_check']['version_compatible']) {
            $recommendations[] = 'Consider updating the platform before importing';
        }

        if ($validation['content_analysis']['size_estimate'] > 100 * 1024 * 1024) {
            $recommendations[] = 'Large import detected - consider importing in batches';
        }

        if (!empty($validation['content_analysis']['potential_issues'])) {
            $recommendations[] = 'Review potential data issues before importing';
        }

        return $recommendations;
    }

    private function exportInChunks(int $userId, array $options, int $chunkSize): array
    {
        // Implementation would handle chunked export for large datasets
        return $this->exportUserData($userId, $options);
    }

    private function compressExportData(array $data, int $level): array
    {
        // Implementation would compress the export data
        return $data;
    }

    // Additional helper methods would be implemented here...
    private function saveExportSchedule(array $schedule): void {}
    private function saveExportTemplate(array $template): void {}
    private function saveBatchExportRecord(string $batchId, int $userId, array $results): void {}
    private function getLastExportTime(int $userId, string $type): ?string { return null; }
    private function updateLastExportTime(int $userId, string $type): void {}
    private function getTotalExports(int $userId): int { return 0; }
    private function getAverageExportTime(int $userId): float { return 0.0; }
    private function getLargestExportSize(int $userId): int { return 0; }
    private function getMostExportedType(int $userId): string { return 'user-data'; }
    private function getExportFrequency(int $userId): array { return []; }
    private function getExportStorageUsage(int $userId): int { return 0; }
    private function countRecords(array $data): int { return count($data); }
    private function identifyDataTypes(array $data): array { return []; }
    private function analyzeDataStructure(array $data): array { return []; }
    private function identifyPotentialIssues(array $data): array { return []; }
    private function checkVersionCompatibility(array $data): bool { return true; }
    private function checkSchemaCompatibility(array $data): bool { return true; }
    private function checkDataFormatSupport(array $data): bool { return true; }
    private function checkMissingDependencies(array $data): array { return []; }
}
