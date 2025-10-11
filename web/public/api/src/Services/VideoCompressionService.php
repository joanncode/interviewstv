<?php

namespace App\Services;

use Exception;

class VideoCompressionService
{
    private $config;
    private $pdo;

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->config = [
            'ffmpeg_path' => '/usr/bin/ffmpeg',
            'ffprobe_path' => '/usr/bin/ffprobe',
            'temp_path' => __DIR__ . '/../../storage/temp/',
            'output_path' => __DIR__ . '/../../storage/processed/',
            'max_concurrent_jobs' => 3,
            'quality_presets' => [
                '240p' => [
                    'resolution' => '426x240',
                    'video_bitrate' => '400k',
                    'audio_bitrate' => '64k',
                    'fps' => 24
                ],
                '360p' => [
                    'resolution' => '640x360',
                    'video_bitrate' => '800k',
                    'audio_bitrate' => '96k',
                    'fps' => 30
                ],
                '480p' => [
                    'resolution' => '854x480',
                    'video_bitrate' => '1200k',
                    'audio_bitrate' => '128k',
                    'fps' => 30
                ],
                '720p' => [
                    'resolution' => '1280x720',
                    'video_bitrate' => '2500k',
                    'audio_bitrate' => '128k',
                    'fps' => 30
                ],
                '1080p' => [
                    'resolution' => '1920x1080',
                    'video_bitrate' => '5000k',
                    'audio_bitrate' => '192k',
                    'fps' => 30
                ]
            ],
            'supported_formats' => ['mp4', 'webm', 'mkv'],
            'default_codec' => [
                'video' => 'libx264',
                'audio' => 'aac'
            ]
        ];

        $this->ensureDirectories();
    }

    /**
     * Compress video with specified quality and format
     */
    public function compressVideo(string $inputPath, string $outputQuality, string $outputFormat = 'mp4', array $options = []): array
    {
        try {
            if (!file_exists($inputPath)) {
                throw new Exception('Input file does not exist');
            }

            if (!isset($this->config['quality_presets'][$outputQuality])) {
                throw new Exception('Unsupported quality preset: ' . $outputQuality);
            }

            if (!in_array($outputFormat, $this->config['supported_formats'])) {
                throw new Exception('Unsupported output format: ' . $outputFormat);
            }

            // Generate unique job ID
            $jobId = 'comp_' . uniqid();
            $outputPath = $this->config['output_path'] . $jobId . '.' . $outputFormat;

            // Get quality preset
            $preset = $this->config['quality_presets'][$outputQuality];

            // Build FFmpeg command
            $command = $this->buildCompressionCommand($inputPath, $outputPath, $preset, $outputFormat, $options);

            // Create processing job
            $this->createProcessingJob($jobId, 'compression', $inputPath, $outputPath, [
                'quality' => $outputQuality,
                'format' => $outputFormat,
                'preset' => $preset,
                'command' => $command
            ]);

            // Start compression process
            $processResult = $this->startCompressionProcess($jobId, $command);

            if ($processResult['success']) {
                return [
                    'success' => true,
                    'data' => [
                        'job_id' => $jobId,
                        'output_path' => $outputPath,
                        'quality' => $outputQuality,
                        'format' => $outputFormat,
                        'status' => 'processing',
                        'process_id' => $processResult['process_id']
                    ]
                ];
            } else {
                throw new Exception('Failed to start compression process: ' . $processResult['message']);
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create multiple quality versions of a video
     */
    public function createMultipleQualities(string $inputPath, array $qualities = ['360p', '720p'], string $format = 'mp4'): array
    {
        try {
            $jobs = [];
            $errors = [];

            foreach ($qualities as $quality) {
                $result = $this->compressVideo($inputPath, $quality, $format);
                
                if ($result['success']) {
                    $jobs[] = $result['data'];
                } else {
                    $errors[] = "Failed to create {$quality}: " . $result['message'];
                }
            }

            return [
                'success' => count($jobs) > 0,
                'data' => [
                    'jobs' => $jobs,
                    'total_jobs' => count($jobs),
                    'errors' => $errors
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
     * Get compression job status
     */
    public function getJobStatus(string $jobId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM video_processing_queue 
            WHERE id = ? OR CONCAT(processing_type, '_', id) = ?
        ");
        $stmt->execute([$jobId, $jobId]);
        $job = $stmt->fetch();

        if (!$job) {
            return [
                'success' => false,
                'message' => 'Job not found'
            ];
        }

        // Check if output file exists and get its info
        $outputInfo = null;
        if ($job['status'] === 'completed' && file_exists($job['output_path'])) {
            $outputInfo = [
                'file_size' => filesize($job['output_path']),
                'file_exists' => true
            ];
        }

        return [
            'success' => true,
            'data' => [
                'job_id' => $jobId,
                'status' => $job['status'],
                'progress_percent' => (int)$job['progress_percent'],
                'started_at' => $job['started_at'],
                'completed_at' => $job['completed_at'],
                'error_message' => $job['error_message'],
                'output_path' => $job['output_path'],
                'output_info' => $outputInfo
            ]
        ];
    }

    /**
     * List compression jobs
     */
    public function listJobs(int $limit = 20, string $status = null): array
    {
        $whereClause = "processing_type = 'compression'";
        $params = [];

        if ($status) {
            $whereClause .= " AND status = ?";
            $params[] = $status;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM video_processing_queue 
            WHERE {$whereClause}
            ORDER BY created_at DESC 
            LIMIT {$limit}
        ");
        $stmt->execute($params);
        $jobs = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $jobs
        ];
    }

    /**
     * Cancel compression job
     */
    public function cancelJob(string $jobId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE video_processing_queue 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? OR CONCAT(processing_type, '_', id) = ?
            ");
            $stmt->execute([$jobId, $jobId]);

            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'data' => ['job_id' => $jobId, 'status' => 'cancelled']
                ];
            } else {
                throw new Exception('Job not found or already completed');
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Build FFmpeg compression command
     */
    private function buildCompressionCommand(string $inputPath, string $outputPath, array $preset, string $format, array $options): string
    {
        $videoCodec = $options['video_codec'] ?? $this->config['default_codec']['video'];
        $audioCodec = $options['audio_codec'] ?? $this->config['default_codec']['audio'];

        // Base command
        $command = sprintf(
            '%s -i "%s" -c:v %s -c:a %s',
            $this->config['ffmpeg_path'],
            $inputPath,
            $videoCodec,
            $audioCodec
        );

        // Video settings
        $command .= sprintf(
            ' -s %s -b:v %s -maxrate %s -bufsize %s',
            $preset['resolution'],
            $preset['video_bitrate'],
            $preset['video_bitrate'],
            $this->calculateBufferSize($preset['video_bitrate'])
        );

        // Audio settings
        $command .= sprintf(' -b:a %s', $preset['audio_bitrate']);

        // Frame rate
        if (isset($preset['fps'])) {
            $command .= sprintf(' -r %d', $preset['fps']);
        }

        // Format-specific options
        switch ($format) {
            case 'mp4':
                $command .= ' -movflags +faststart -preset medium';
                break;
            case 'webm':
                $command .= ' -deadline realtime -cpu-used 4';
                break;
        }

        // Progress reporting
        $command .= ' -progress pipe:1';

        // Output file
        $command .= sprintf(' "%s" 2>&1', $outputPath);

        return $command;
    }

    /**
     * Start compression process
     */
    private function startCompressionProcess(string $jobId, string $command): array
    {
        try {
            $descriptors = [
                0 => ['pipe', 'r'], // stdin
                1 => ['pipe', 'w'], // stdout
                2 => ['pipe', 'w']  // stderr
            ];

            $process = proc_open($command, $descriptors, $pipes);

            if (!is_resource($process)) {
                throw new Exception('Failed to start FFmpeg process');
            }

            // Make pipes non-blocking
            stream_set_blocking($pipes[1], false);
            stream_set_blocking($pipes[2], false);

            // Update job status
            $this->updateJobStatus($jobId, 'processing', 0);

            // In a real implementation, you'd want to handle this process in the background
            // For now, we'll just return the process info
            $processInfo = proc_get_status($process);

            return [
                'success' => true,
                'process_id' => $processInfo['pid'],
                'job_id' => $jobId
            ];

        } catch (Exception $e) {
            $this->updateJobStatus($jobId, 'failed', 0, $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create processing job record
     */
    private function createProcessingJob(string $jobId, string $type, string $inputPath, string $outputPath, array $params): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO video_processing_queue (
                recording_id, processing_type, input_path, output_path,
                processing_params, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        ");

        $stmt->execute([
            $jobId, // Using jobId as recording_id for compression jobs
            $type,
            $inputPath,
            $outputPath,
            json_encode($params)
        ]);
    }

    /**
     * Update job status
     */
    private function updateJobStatus(string $jobId, string $status, int $progress, string $errorMessage = null): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE video_processing_queue 
            SET 
                status = ?, 
                progress_percent = ?,
                error_message = ?,
                started_at = CASE WHEN status = 'pending' AND ? = 'processing' THEN CURRENT_TIMESTAMP ELSE started_at END,
                completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE recording_id = ?
        ");

        $stmt->execute([$status, $progress, $errorMessage, $status, $status, $jobId]);
    }

    /**
     * Calculate buffer size based on bitrate
     */
    private function calculateBufferSize(string $bitrate): string
    {
        $bitrateValue = (int)filter_var($bitrate, FILTER_SANITIZE_NUMBER_INT);
        return ($bitrateValue * 2) . 'k';
    }

    /**
     * Get available quality presets
     */
    public function getQualityPresets(): array
    {
        return [
            'success' => true,
            'data' => array_keys($this->config['quality_presets'])
        ];
    }

    /**
     * Get supported formats
     */
    public function getSupportedFormats(): array
    {
        return [
            'success' => true,
            'data' => $this->config['supported_formats']
        ];
    }

    /**
     * Cleanup old compression jobs and files
     */
    public function cleanupOldJobs(int $daysOld = 7): array
    {
        try {
            $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$daysOld} days"));

            // Get old completed/failed jobs
            $stmt = $this->pdo->prepare("
                SELECT output_path FROM video_processing_queue
                WHERE processing_type = 'compression'
                AND status IN ('completed', 'failed')
                AND completed_at < ?
            ");
            $stmt->execute([$cutoffDate]);
            $oldJobs = $stmt->fetchAll();

            $deletedFiles = 0;
            $totalSize = 0;

            // Delete output files
            foreach ($oldJobs as $job) {
                if (file_exists($job['output_path'])) {
                    $size = filesize($job['output_path']);
                    if (unlink($job['output_path'])) {
                        $deletedFiles++;
                        $totalSize += $size;
                    }
                }
            }

            // Delete job records
            $deleteStmt = $this->pdo->prepare("
                DELETE FROM video_processing_queue
                WHERE processing_type = 'compression'
                AND status IN ('completed', 'failed')
                AND completed_at < ?
            ");
            $deleteStmt->execute([$cutoffDate]);
            $deletedJobs = $deleteStmt->rowCount();

            return [
                'success' => true,
                'data' => [
                    'deleted_jobs' => $deletedJobs,
                    'deleted_files' => $deletedFiles,
                    'space_freed' => $totalSize,
                    'space_freed_formatted' => $this->formatFileSize($totalSize)
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
     * Ensure required directories exist
     */
    private function ensureDirectories(): void
    {
        $directories = [
            $this->config['temp_path'],
            $this->config['output_path']
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
}
