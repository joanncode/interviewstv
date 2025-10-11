<?php

namespace App\Services;

use Exception;

class VideoStorageService
{
    private $config;
    private $pdo;
    private $thumbnailService;
    private $metadataService;

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->config = [
            'storage_root' => __DIR__ . '/../../storage/',
            'recordings_path' => 'recordings/',
            'thumbnails_path' => 'thumbnails/',
            'processed_path' => 'processed/',
            'temp_path' => 'temp/',
            'max_file_size' => 2 * 1024 * 1024 * 1024, // 2GB
            'allowed_formats' => ['mp4', 'webm', 'mkv', 'avi', 'mov'],
            'storage_quota_gb' => 100, // 100GB default quota
            'cleanup_days' => 90, // Auto-cleanup after 90 days
            'directory_structure' => 'year/month/day' // YYYY/MM/DD
        ];

        // Initialize thumbnail service
        require_once __DIR__ . '/VideoThumbnailService.php';
        $this->thumbnailService = new VideoThumbnailService($pdo);

        // Initialize metadata service
        require_once __DIR__ . '/VideoMetadataService.php';
        $this->metadataService = new VideoMetadataService($pdo);

        $this->initializeStorage();
    }

    /**
     * Store a video file with proper organization
     */
    public function storeVideo(string $recordingId, string $sourceFilePath, array $metadata = []): array
    {
        try {
            if (!file_exists($sourceFilePath)) {
                throw new Exception('Source file does not exist');
            }

            $fileInfo = pathinfo($sourceFilePath);
            $extension = strtolower($fileInfo['extension'] ?? 'mp4');
            
            if (!in_array($extension, $this->config['allowed_formats'])) {
                throw new Exception('Unsupported file format: ' . $extension);
            }

            $fileSize = filesize($sourceFilePath);
            if ($fileSize > $this->config['max_file_size']) {
                throw new Exception('File size exceeds maximum allowed size');
            }

            // Generate storage path
            $storagePath = $this->generateStoragePath($recordingId, $extension);
            $fullPath = $this->config['storage_root'] . $storagePath;

            // Ensure directory exists
            $directory = dirname($fullPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Move file to storage location
            if (!rename($sourceFilePath, $fullPath)) {
                throw new Exception('Failed to move file to storage location');
            }

            // Store file metadata
            $fileMetadata = array_merge([
                'recording_id' => $recordingId,
                'original_filename' => $fileInfo['basename'],
                'storage_path' => $storagePath,
                'file_size' => $fileSize,
                'format' => $extension,
                'mime_type' => $this->getMimeType($extension),
                'stored_at' => date('Y-m-d H:i:s')
            ], $metadata);

            $this->storeFileMetadata($fileMetadata);

            // Extract metadata automatically
            $metadataResult = $this->metadataService->extractMetadata($fullPath, $recordingId);

            // Generate thumbnails automatically
            $thumbnailResult = $this->thumbnailService->generateAllThumbnails($fullPath, $recordingId);

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'storage_path' => $storagePath,
                    'full_path' => $fullPath,
                    'file_size' => $fileSize,
                    'format' => $extension,
                    'url' => $this->generateFileUrl($storagePath),
                    'metadata' => $metadataResult['success'] ? $metadataResult['data'] : null,
                    'thumbnails' => $thumbnailResult['success'] ? $thumbnailResult['data'] : null
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Retrieve video file information
     */
    public function getVideoFile(string $recordingId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM video_files 
            WHERE recording_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$recordingId]);
        $file = $stmt->fetch();

        if ($file) {
            $file['full_path'] = $this->config['storage_root'] . $file['storage_path'];
            $file['url'] = $this->generateFileUrl($file['storage_path']);
            $file['exists'] = file_exists($file['full_path']);
        }

        return $file ?: null;
    }

    /**
     * List video files with pagination
     */
    public function listVideoFiles(int $userId = null, int $page = 1, int $limit = 20, array $filters = []): array
    {
        $offset = ($page - 1) * $limit;
        $whereConditions = ['vf.deleted_at IS NULL'];
        $params = [];

        if ($userId) {
            $whereConditions[] = 'ir.host_user_id = ?';
            $params[] = $userId;
        }

        if (!empty($filters['format'])) {
            $whereConditions[] = 'vf.format = ?';
            $params[] = $filters['format'];
        }

        if (!empty($filters['date_from'])) {
            $whereConditions[] = 'vf.created_at >= ?';
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $whereConditions[] = 'vf.created_at <= ?';
            $params[] = $filters['date_to'];
        }

        $whereClause = implode(' AND ', $whereConditions);

        // Get total count
        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*) as total
            FROM video_files vf
            JOIN interview_recordings ir ON vf.recording_id = ir.id
            WHERE {$whereClause}
        ");
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];

        // Get files
        $stmt = $this->pdo->prepare("
            SELECT vf.*, ir.title as recording_title, ir.started_at as recording_date
            FROM video_files vf
            JOIN interview_recordings ir ON vf.recording_id = ir.id
            WHERE {$whereClause}
            ORDER BY vf.created_at DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $files = $stmt->fetchAll();

        // Add URLs and file existence check
        foreach ($files as &$file) {
            $file['full_path'] = $this->config['storage_root'] . $file['storage_path'];
            $file['url'] = $this->generateFileUrl($file['storage_path']);
            $file['exists'] = file_exists($file['full_path']);
        }

        return [
            'files' => $files,
            'pagination' => [
                'current_page' => $page,
                'total_items' => $total,
                'items_per_page' => $limit,
                'total_pages' => ceil($total / $limit)
            ]
        ];
    }

    /**
     * Delete video file
     */
    public function deleteVideoFile(string $recordingId, bool $hardDelete = false): array
    {
        try {
            $file = $this->getVideoFile($recordingId);
            if (!$file) {
                throw new Exception('Video file not found');
            }

            if ($hardDelete) {
                // Physically delete the file
                if (file_exists($file['full_path'])) {
                    unlink($file['full_path']);
                }

                // Delete from database
                $stmt = $this->pdo->prepare("DELETE FROM video_files WHERE recording_id = ?");
                $stmt->execute([$recordingId]);
            } else {
                // Soft delete - mark as deleted
                $stmt = $this->pdo->prepare("
                    UPDATE video_files 
                    SET deleted_at = CURRENT_TIMESTAMP 
                    WHERE recording_id = ?
                ");
                $stmt->execute([$recordingId]);
            }

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'deleted_type' => $hardDelete ? 'hard' : 'soft'
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get storage statistics
     */
    public function getStorageStats(int $userId = null): array
    {
        $whereCondition = $userId ? 'WHERE ir.host_user_id = ?' : '';
        $params = $userId ? [$userId] : [];

        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(*) as total_files,
                SUM(vf.file_size) as total_size,
                AVG(vf.file_size) as avg_file_size,
                MIN(vf.created_at) as oldest_file,
                MAX(vf.created_at) as newest_file
            FROM video_files vf
            JOIN interview_recordings ir ON vf.recording_id = ir.id
            {$whereCondition} AND vf.deleted_at IS NULL
        ");
        $stmt->execute($params);
        $stats = $stmt->fetch();

        // Get format distribution
        $formatStmt = $this->pdo->prepare("
            SELECT 
                vf.format,
                COUNT(*) as count,
                SUM(vf.file_size) as total_size
            FROM video_files vf
            JOIN interview_recordings ir ON vf.recording_id = ir.id
            {$whereCondition} AND vf.deleted_at IS NULL
            GROUP BY vf.format
            ORDER BY count DESC
        ");
        $formatStmt->execute($params);
        $formatStats = $formatStmt->fetchAll();

        return [
            'total_files' => (int)$stats['total_files'],
            'total_size' => (int)$stats['total_size'],
            'total_size_formatted' => $this->formatFileSize($stats['total_size']),
            'avg_file_size' => (int)$stats['avg_file_size'],
            'avg_file_size_formatted' => $this->formatFileSize($stats['avg_file_size']),
            'oldest_file' => $stats['oldest_file'],
            'newest_file' => $stats['newest_file'],
            'format_distribution' => $formatStats,
            'quota_used_percent' => $this->getQuotaUsagePercent($stats['total_size']),
            'available_space' => $this->getAvailableSpace()
        ];
    }

    /**
     * Generate storage path based on date structure
     */
    private function generateStoragePath(string $recordingId, string $extension): string
    {
        $date = new \DateTime();
        $year = $date->format('Y');
        $month = $date->format('m');
        $day = $date->format('d');

        return $this->config['recordings_path'] . "{$year}/{$month}/{$day}/{$recordingId}.{$extension}";
    }

    /**
     * Store file metadata in database
     */
    private function storeFileMetadata(array $metadata): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO video_files (
                recording_id, original_filename, storage_path, file_size,
                format, mime_type, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $metadata['recording_id'],
            $metadata['original_filename'],
            $metadata['storage_path'],
            $metadata['file_size'],
            $metadata['format'],
            $metadata['mime_type'],
            json_encode($metadata),
            $metadata['stored_at']
        ]);
    }

    /**
     * Generate file URL for serving
     */
    private function generateFileUrl(string $storagePath): string
    {
        // This would typically be a CDN URL or web-accessible path
        return '/api/videos/stream/' . base64_encode($storagePath);
    }

    /**
     * Get MIME type for file extension
     */
    private function getMimeType(string $extension): string
    {
        $mimeTypes = [
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mkv' => 'video/x-matroska',
            'avi' => 'video/x-msvideo',
            'mov' => 'video/quicktime'
        ];

        return $mimeTypes[$extension] ?? 'video/mp4';
    }

    /**
     * Enforce storage quota for user
     */
    public function enforceStorageQuota(int $userId): array
    {
        try {
            $stats = $this->getStorageStats($userId);
            $quotaBytes = $this->config['storage_quota_gb'] * 1024 * 1024 * 1024;

            if ($stats['data']['total_size_bytes'] > $quotaBytes) {
                // Find oldest files to delete
                $stmt = $this->pdo->prepare("
                    SELECT vf.recording_id, vf.storage_path, vf.file_size
                    FROM video_files vf
                    JOIN interview_recordings ir ON vf.recording_id = ir.id
                    WHERE ir.host_user_id = ? AND vf.deleted_at IS NULL
                    ORDER BY vf.created_at ASC
                ");
                $stmt->execute([$userId]);
                $files = $stmt->fetchAll();

                $deletedFiles = 0;
                $freedSpace = 0;
                $targetReduction = $stats['data']['total_size_bytes'] - ($quotaBytes * 0.9); // Reduce to 90% of quota

                foreach ($files as $file) {
                    if ($freedSpace >= $targetReduction) break;

                    $deleteResult = $this->deleteVideoFile($file['recording_id'], false); // Soft delete
                    if ($deleteResult['success']) {
                        $deletedFiles++;
                        $freedSpace += $file['file_size'];
                    }
                }

                return [
                    'success' => true,
                    'data' => [
                        'quota_exceeded' => true,
                        'deleted_files' => $deletedFiles,
                        'space_freed' => $freedSpace,
                        'space_freed_formatted' => $this->formatFileSize($freedSpace)
                    ]
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'quota_exceeded' => false,
                    'usage_percent' => round(($stats['data']['total_size_bytes'] / $quotaBytes) * 100, 1)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Cleanup old files based on policy
     */
    public function cleanupOldFiles(int $daysOld = null): array
    {
        try {
            $daysOld = $daysOld ?? $this->config['cleanup_days'];
            $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$daysOld} days"));

            // Get old files
            $stmt = $this->pdo->prepare("
                SELECT recording_id, storage_path, file_size
                FROM video_files
                WHERE created_at < ? AND deleted_at IS NULL
            ");
            $stmt->execute([$cutoffDate]);
            $oldFiles = $stmt->fetchAll();

            $deletedFiles = 0;
            $totalSize = 0;

            foreach ($oldFiles as $file) {
                $deleteResult = $this->deleteVideoFile($file['recording_id'], true); // Hard delete
                if ($deleteResult['success']) {
                    $deletedFiles++;
                    $totalSize += $file['file_size'];
                }
            }

            return [
                'success' => true,
                'data' => [
                    'deleted_files' => $deletedFiles,
                    'space_freed' => $totalSize,
                    'space_freed_formatted' => $this->formatFileSize($totalSize),
                    'cutoff_date' => $cutoffDate
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Optimize storage by compressing old files
     */
    public function optimizeStorage(int $daysOld = 30): array
    {
        try {
            $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$daysOld} days"));

            // Find large, old files that could be compressed
            $stmt = $this->pdo->prepare("
                SELECT vf.recording_id, vf.storage_path, vf.file_size, vf.format
                FROM video_files vf
                WHERE vf.created_at < ?
                AND vf.deleted_at IS NULL
                AND vf.file_size > ?
                AND vf.processing_status != 'optimized'
                ORDER BY vf.file_size DESC
                LIMIT 10
            ");
            $stmt->execute([$cutoffDate, 100 * 1024 * 1024]); // Files larger than 100MB
            $candidates = $stmt->fetchAll();

            $optimizedFiles = 0;
            $spaceSaved = 0;

            // Initialize compression service
            require_once __DIR__ . '/VideoCompressionService.php';
            $compressionService = new VideoCompressionService($this->pdo);

            foreach ($candidates as $file) {
                $fullPath = $this->config['storage_root'] . $file['storage_path'];

                if (file_exists($fullPath)) {
                    // Compress to lower quality for archival
                    $result = $compressionService->compressVideo($fullPath, '480p', 'mp4', [
                        'video_codec' => 'libx264',
                        'audio_codec' => 'aac'
                    ]);

                    if ($result['success']) {
                        $optimizedFiles++;
                        $originalSize = $file['file_size'];

                        // Update processing status
                        $updateStmt = $this->pdo->prepare("
                            UPDATE video_files
                            SET processing_status = 'optimized', updated_at = CURRENT_TIMESTAMP
                            WHERE recording_id = ?
                        ");
                        $updateStmt->execute([$file['recording_id']]);
                    }
                }
            }

            return [
                'success' => true,
                'data' => [
                    'optimized_files' => $optimizedFiles,
                    'candidates_found' => count($candidates),
                    'space_saved_estimate' => $spaceSaved,
                    'cutoff_date' => $cutoffDate
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get detailed storage analytics
     */
    public function getStorageAnalytics(int $userId = null): array
    {
        try {
            $whereClause = $userId ? 'WHERE ir.host_user_id = ?' : '';
            $params = $userId ? [$userId] : [];

            // Overall statistics
            $stmt = $this->pdo->prepare("
                SELECT
                    COUNT(*) as total_files,
                    SUM(file_size) as total_size,
                    AVG(file_size) as avg_file_size,
                    MIN(created_at) as oldest_file,
                    MAX(created_at) as newest_file,
                    COUNT(DISTINCT format) as unique_formats
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                {$whereClause} AND vf.deleted_at IS NULL
            ");
            $stmt->execute($params);
            $overall = $stmt->fetch();

            // Format distribution
            $formatStmt = $this->pdo->prepare("
                SELECT
                    format,
                    COUNT(*) as count,
                    SUM(file_size) as total_size,
                    AVG(file_size) as avg_size
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                {$whereClause} AND vf.deleted_at IS NULL
                GROUP BY format
                ORDER BY total_size DESC
            ");
            $formatStmt->execute($params);
            $formatDistribution = $formatStmt->fetchAll();

            // Size distribution
            $sizeStmt = $this->pdo->prepare("
                SELECT
                    CASE
                        WHEN file_size < 10485760 THEN 'Under 10MB'
                        WHEN file_size < 104857600 THEN '10MB - 100MB'
                        WHEN file_size < 1073741824 THEN '100MB - 1GB'
                        ELSE 'Over 1GB'
                    END as size_range,
                    COUNT(*) as count,
                    SUM(file_size) as total_size
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                {$whereClause} AND vf.deleted_at IS NULL
                GROUP BY size_range
                ORDER BY MIN(file_size)
            ");
            $sizeStmt->execute($params);
            $sizeDistribution = $sizeStmt->fetchAll();

            // Monthly growth
            $growthStmt = $this->pdo->prepare("
                SELECT
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as files_added,
                    SUM(file_size) as size_added
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                {$whereClause} AND vf.deleted_at IS NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY month
                ORDER BY month
            ");
            $growthStmt->execute($params);
            $monthlyGrowth = $growthStmt->fetchAll();

            return [
                'success' => true,
                'data' => [
                    'overall' => [
                        'total_files' => (int)$overall['total_files'],
                        'total_size' => (int)$overall['total_size'],
                        'total_size_formatted' => $this->formatFileSize((int)$overall['total_size']),
                        'avg_file_size' => (int)$overall['avg_file_size'],
                        'avg_file_size_formatted' => $this->formatFileSize((int)$overall['avg_file_size']),
                        'oldest_file' => $overall['oldest_file'],
                        'newest_file' => $overall['newest_file'],
                        'unique_formats' => (int)$overall['unique_formats']
                    ],
                    'format_distribution' => array_map(function($item) {
                        $item['total_size_formatted'] = $this->formatFileSize($item['total_size']);
                        $item['avg_size_formatted'] = $this->formatFileSize($item['avg_size']);
                        return $item;
                    }, $formatDistribution),
                    'size_distribution' => array_map(function($item) {
                        $item['total_size_formatted'] = $this->formatFileSize($item['total_size']);
                        return $item;
                    }, $sizeDistribution),
                    'monthly_growth' => array_map(function($item) {
                        $item['size_added_formatted'] = $this->formatFileSize($item['size_added']);
                        return $item;
                    }, $monthlyGrowth)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Update storage statistics table
     */
    public function updateStorageStatistics(): array
    {
        try {
            $today = date('Y-m-d');

            // Calculate current statistics
            $stmt = $this->pdo->prepare("
                SELECT
                    COUNT(*) as total_files,
                    COUNT(DISTINCT recording_id) as total_recordings,
                    SUM(file_size) as total_size,
                    SUM(CASE WHEN format = 'mp4' THEN 1 ELSE 0 END) as mp4_files,
                    SUM(CASE WHEN format = 'webm' THEN 1 ELSE 0 END) as webm_files,
                    SUM(CASE WHEN format NOT IN ('mp4', 'webm') THEN 1 ELSE 0 END) as other_files
                FROM video_files
                WHERE deleted_at IS NULL
            ");
            $stmt->execute();
            $stats = $stmt->fetch();

            // Get thumbnail count
            $thumbStmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM video_thumbnails");
            $thumbStmt->execute();
            $thumbnailCount = $thumbStmt->fetch()['count'];

            // Get thumbnail size
            $thumbSizeStmt = $this->pdo->prepare("SELECT SUM(file_size) as size FROM video_thumbnails");
            $thumbSizeStmt->execute();
            $thumbnailSize = $thumbSizeStmt->fetch()['size'] ?? 0;

            // Get processing queue stats
            $queueStmt = $this->pdo->prepare("
                SELECT
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM video_processing_queue
            ");
            $queueStmt->execute();
            $queueStats = $queueStmt->fetch();

            // Insert or update statistics
            $insertStmt = $this->pdo->prepare("
                INSERT INTO storage_statistics (
                    date, total_files, total_recordings, total_thumbnails,
                    total_size_bytes, recordings_size_bytes, thumbnails_size_bytes,
                    mp4_files, webm_files, other_files,
                    pending_processing, failed_processing
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date) DO UPDATE SET
                    total_files = excluded.total_files,
                    total_recordings = excluded.total_recordings,
                    total_thumbnails = excluded.total_thumbnails,
                    total_size_bytes = excluded.total_size_bytes,
                    recordings_size_bytes = excluded.recordings_size_bytes,
                    thumbnails_size_bytes = excluded.thumbnails_size_bytes,
                    mp4_files = excluded.mp4_files,
                    webm_files = excluded.webm_files,
                    other_files = excluded.other_files,
                    pending_processing = excluded.pending_processing,
                    failed_processing = excluded.failed_processing
            ");

            $insertStmt->execute([
                $today,
                $stats['total_files'],
                $stats['total_recordings'],
                $thumbnailCount,
                $stats['total_size'],
                $stats['total_size'],
                $thumbnailSize,
                $stats['mp4_files'],
                $stats['webm_files'],
                $stats['other_files'],
                $queueStats['pending'],
                $queueStats['failed']
            ]);

            return [
                'success' => true,
                'data' => [
                    'date' => $today,
                    'statistics_updated' => true
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Format file size for display
     */
    private function formatFileSize(int $bytes): string
    {
        if ($bytes === 0) return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = floor(log($bytes, 1024));

        return round($bytes / pow(1024, $power), 2) . ' ' . $units[$power];
    }

    /**
     * Get quota usage percentage
     */
    private function getQuotaUsagePercent(int $usedBytes): float
    {
        $quotaBytes = $this->config['storage_quota_gb'] * 1024 * 1024 * 1024;
        return ($usedBytes / $quotaBytes) * 100;
    }

    /**
     * Get available storage space
     */
    private function getAvailableSpace(): array
    {
        $quotaBytes = $this->config['storage_quota_gb'] * 1024 * 1024 * 1024;
        $diskFree = disk_free_space($this->config['storage_root']);
        
        return [
            'quota_available' => $quotaBytes,
            'disk_available' => $diskFree,
            'effective_available' => min($quotaBytes, $diskFree),
            'quota_available_formatted' => $this->formatFileSize($quotaBytes),
            'disk_available_formatted' => $this->formatFileSize($diskFree)
        ];
    }

    /**
     * Initialize storage directories
     */
    private function initializeStorage(): void
    {
        $directories = [
            $this->config['storage_root'],
            $this->config['storage_root'] . $this->config['recordings_path'],
            $this->config['storage_root'] . $this->config['thumbnails_path'],
            $this->config['storage_root'] . $this->config['processed_path'],
            $this->config['storage_root'] . $this->config['temp_path']
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
}
