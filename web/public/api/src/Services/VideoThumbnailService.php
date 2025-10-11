<?php

namespace App\Services;

use Exception;

class VideoThumbnailService
{
    private $config;
    private $pdo;

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->config = [
            'ffmpeg_path' => '/usr/bin/ffmpeg',
            'ffprobe_path' => '/usr/bin/ffprobe',
            'thumbnails_path' => __DIR__ . '/../../storage/thumbnails/',
            'temp_path' => __DIR__ . '/../../storage/temp/',
            'default_sizes' => [
                'small' => ['width' => 160, 'height' => 90],   // 16:9 ratio
                'medium' => ['width' => 320, 'height' => 180],
                'large' => ['width' => 640, 'height' => 360],
                'poster' => ['width' => 1280, 'height' => 720]
            ],
            'thumbnail_types' => [
                'poster' => 'Single frame at 10% of video duration',
                'timeline' => 'Multiple frames at regular intervals',
                'preview' => 'Animated GIF preview'
            ],
            'timeline_frames' => 9, // Number of frames for timeline thumbnails
            'preview_duration' => 3, // Duration for animated previews in seconds
            'quality' => 85 // JPEG quality (1-100)
        ];

        $this->ensureDirectories();
    }

    /**
     * Generate poster thumbnail (single frame)
     */
    public function generatePosterThumbnail(string $videoPath, string $recordingId, array $options = []): array
    {
        try {
            if (!file_exists($videoPath)) {
                throw new Exception('Video file does not exist');
            }

            // Get video duration
            $duration = $this->getVideoDuration($videoPath);
            if (!$duration) {
                throw new Exception('Could not determine video duration');
            }

            // Calculate timestamp (default: 10% into video)
            $timestampPercent = $options['timestamp_percent'] ?? 10;
            $timestamp = ($duration * $timestampPercent) / 100;

            // Generate thumbnail sizes
            $sizes = $options['sizes'] ?? ['medium', 'large'];
            $thumbnails = [];

            foreach ($sizes as $sizeName) {
                if (!isset($this->config['default_sizes'][$sizeName])) {
                    continue;
                }

                $size = $this->config['default_sizes'][$sizeName];
                $outputPath = $this->generateThumbnailPath($recordingId, 'poster', $sizeName);

                $result = $this->extractFrame($videoPath, $outputPath, $timestamp, $size);
                
                if ($result['success']) {
                    $thumbnails[] = $this->storeThumbnailMetadata(
                        $recordingId,
                        $outputPath,
                        'poster',
                        $timestamp,
                        $size,
                        $sizeName === 'large' // Set large as primary
                    );
                }
            }

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'type' => 'poster',
                    'timestamp' => $timestamp,
                    'thumbnails' => $thumbnails
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
     * Generate timeline thumbnails (multiple frames)
     */
    public function generateTimelineThumbnails(string $videoPath, string $recordingId, array $options = []): array
    {
        try {
            if (!file_exists($videoPath)) {
                throw new Exception('Video file does not exist');
            }

            $duration = $this->getVideoDuration($videoPath);
            if (!$duration) {
                throw new Exception('Could not determine video duration');
            }

            $frameCount = $options['frame_count'] ?? $this->config['timeline_frames'];
            $size = $options['size'] ?? $this->config['default_sizes']['small'];
            $thumbnails = [];

            // Calculate timestamps for frames
            $interval = $duration / ($frameCount + 1);

            for ($i = 1; $i <= $frameCount; $i++) {
                $timestamp = $interval * $i;
                $outputPath = $this->generateThumbnailPath($recordingId, 'timeline', "frame_{$i}");

                $result = $this->extractFrame($videoPath, $outputPath, $timestamp, $size);
                
                if ($result['success']) {
                    $thumbnails[] = $this->storeThumbnailMetadata(
                        $recordingId,
                        $outputPath,
                        'timeline',
                        $timestamp,
                        $size,
                        false
                    );
                }
            }

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'type' => 'timeline',
                    'frame_count' => count($thumbnails),
                    'thumbnails' => $thumbnails
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
     * Generate animated preview (GIF)
     */
    public function generateAnimatedPreview(string $videoPath, string $recordingId, array $options = []): array
    {
        try {
            if (!file_exists($videoPath)) {
                throw new Exception('Video file does not exist');
            }

            $duration = $this->getVideoDuration($videoPath);
            if (!$duration) {
                throw new Exception('Could not determine video duration');
            }

            // Calculate start time (default: 10% into video)
            $startPercent = $options['start_percent'] ?? 10;
            $startTime = ($duration * $startPercent) / 100;
            
            $previewDuration = $options['duration'] ?? $this->config['preview_duration'];
            $size = $options['size'] ?? $this->config['default_sizes']['medium'];
            $fps = $options['fps'] ?? 10;

            $outputPath = $this->generateThumbnailPath($recordingId, 'preview', 'animated', 'gif');

            $result = $this->createAnimatedGif($videoPath, $outputPath, $startTime, $previewDuration, $size, $fps);

            if ($result['success']) {
                $thumbnail = $this->storeThumbnailMetadata(
                    $recordingId,
                    $outputPath,
                    'preview',
                    $startTime,
                    $size,
                    false
                );

                return [
                    'success' => true,
                    'data' => [
                        'recording_id' => $recordingId,
                        'type' => 'preview',
                        'start_time' => $startTime,
                        'duration' => $previewDuration,
                        'thumbnail' => $thumbnail
                    ]
                ];
            } else {
                throw new Exception('Failed to create animated preview: ' . $result['message']);
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate all thumbnail types for a video
     */
    public function generateAllThumbnails(string $videoPath, string $recordingId): array
    {
        try {
            $results = [];
            $errors = [];

            // Generate poster thumbnail
            $posterResult = $this->generatePosterThumbnail($videoPath, $recordingId);
            if ($posterResult['success']) {
                $results['poster'] = $posterResult['data'];
            } else {
                $errors['poster'] = $posterResult['message'];
            }

            // Generate timeline thumbnails
            $timelineResult = $this->generateTimelineThumbnails($videoPath, $recordingId);
            if ($timelineResult['success']) {
                $results['timeline'] = $timelineResult['data'];
            } else {
                $errors['timeline'] = $timelineResult['message'];
            }

            // Generate animated preview
            $previewResult = $this->generateAnimatedPreview($videoPath, $recordingId);
            if ($previewResult['success']) {
                $results['preview'] = $previewResult['data'];
            } else {
                $errors['preview'] = $previewResult['message'];
            }

            return [
                'success' => count($results) > 0,
                'data' => [
                    'recording_id' => $recordingId,
                    'generated_types' => array_keys($results),
                    'results' => $results,
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
     * Get thumbnails for a recording
     */
    public function getThumbnails(string $recordingId, string $type = null): array
    {
        $whereClause = 'recording_id = ?';
        $params = [$recordingId];

        if ($type) {
            $whereClause .= ' AND thumbnail_type = ?';
            $params[] = $type;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM video_thumbnails 
            WHERE {$whereClause}
            ORDER BY thumbnail_type, timestamp_seconds
        ");
        $stmt->execute($params);
        $thumbnails = $stmt->fetchAll();

        // Add URLs and file existence check
        foreach ($thumbnails as &$thumbnail) {
            $thumbnail['url'] = $this->generateThumbnailUrl($thumbnail['thumbnail_path']);
            $thumbnail['exists'] = file_exists($thumbnail['thumbnail_path']);
        }

        return [
            'success' => true,
            'data' => $thumbnails
        ];
    }

    /**
     * Delete thumbnails for a recording
     */
    public function deleteThumbnails(string $recordingId, string $type = null): array
    {
        try {
            // Get thumbnails to delete
            $thumbnails = $this->getThumbnails($recordingId, $type);
            
            $deletedFiles = 0;
            $totalSize = 0;

            // Delete physical files
            foreach ($thumbnails['data'] as $thumbnail) {
                if (file_exists($thumbnail['thumbnail_path'])) {
                    $size = filesize($thumbnail['thumbnail_path']);
                    if (unlink($thumbnail['thumbnail_path'])) {
                        $deletedFiles++;
                        $totalSize += $size;
                    }
                }
            }

            // Delete database records
            $whereClause = 'recording_id = ?';
            $params = [$recordingId];

            if ($type) {
                $whereClause .= ' AND thumbnail_type = ?';
                $params[] = $type;
            }

            $stmt = $this->pdo->prepare("DELETE FROM video_thumbnails WHERE {$whereClause}");
            $stmt->execute($params);
            $deletedRecords = $stmt->rowCount();

            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'deleted_files' => $deletedFiles,
                    'deleted_records' => $deletedRecords,
                    'space_freed' => $totalSize
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
     * Extract single frame from video
     */
    private function extractFrame(string $videoPath, string $outputPath, float $timestamp, array $size): array
    {
        try {
            $command = sprintf(
                '%s -i "%s" -ss %f -vframes 1 -s %dx%d -q:v %d "%s" 2>&1',
                $this->config['ffmpeg_path'],
                $videoPath,
                $timestamp,
                $size['width'],
                $size['height'],
                $this->config['quality'],
                $outputPath
            );

            $output = [];
            $returnCode = 0;
            exec($command, $output, $returnCode);

            if ($returnCode === 0 && file_exists($outputPath)) {
                return [
                    'success' => true,
                    'output_path' => $outputPath,
                    'file_size' => filesize($outputPath)
                ];
            } else {
                throw new Exception('FFmpeg failed: ' . implode('\n', $output));
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create animated GIF preview
     */
    private function createAnimatedGif(string $videoPath, string $outputPath, float $startTime, float $duration, array $size, int $fps): array
    {
        try {
            $command = sprintf(
                '%s -i "%s" -ss %f -t %f -vf "fps=%d,scale=%d:%d:flags=lanczos" "%s" 2>&1',
                $this->config['ffmpeg_path'],
                $videoPath,
                $startTime,
                $duration,
                $fps,
                $size['width'],
                $size['height'],
                $outputPath
            );

            $output = [];
            $returnCode = 0;
            exec($command, $output, $returnCode);

            if ($returnCode === 0 && file_exists($outputPath)) {
                return [
                    'success' => true,
                    'output_path' => $outputPath,
                    'file_size' => filesize($outputPath)
                ];
            } else {
                throw new Exception('FFmpeg GIF creation failed: ' . implode('\n', $output));
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get video duration using ffprobe
     */
    private function getVideoDuration(string $videoPath): ?float
    {
        $command = sprintf(
            '%s -v quiet -show_entries format=duration -of csv=p=0 "%s"',
            $this->config['ffprobe_path'],
            $videoPath
        );

        $output = shell_exec($command);
        return $output ? (float)trim($output) : null;
    }

    /**
     * Generate thumbnail file path
     */
    private function generateThumbnailPath(string $recordingId, string $type, string $variant, string $extension = 'jpg'): string
    {
        $date = new \DateTime();
        $year = $date->format('Y');
        $month = $date->format('m');
        
        $directory = $this->config['thumbnails_path'] . "{$year}/{$month}/{$recordingId}/";
        
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        return $directory . "{$type}_{$variant}.{$extension}";
    }

    /**
     * Store thumbnail metadata in database
     */
    private function storeThumbnailMetadata(string $recordingId, string $thumbnailPath, string $type, float $timestamp, array $size, bool $isPrimary): array
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO video_thumbnails (
                recording_id, thumbnail_path, thumbnail_type, timestamp_seconds,
                width, height, file_size, is_primary, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");

        $fileSize = file_exists($thumbnailPath) ? filesize($thumbnailPath) : 0;

        $stmt->execute([
            $recordingId,
            $thumbnailPath,
            $type,
            $timestamp,
            $size['width'],
            $size['height'],
            $fileSize,
            $isPrimary ? 1 : 0
        ]);

        return [
            'id' => $this->pdo->lastInsertId(),
            'recording_id' => $recordingId,
            'thumbnail_path' => $thumbnailPath,
            'thumbnail_type' => $type,
            'timestamp_seconds' => $timestamp,
            'width' => $size['width'],
            'height' => $size['height'],
            'file_size' => $fileSize,
            'is_primary' => $isPrimary,
            'url' => $this->generateThumbnailUrl($thumbnailPath)
        ];
    }

    /**
     * Generate thumbnail URL
     */
    private function generateThumbnailUrl(string $thumbnailPath): string
    {
        $relativePath = str_replace($this->config['thumbnails_path'], '', $thumbnailPath);
        return '/api/thumbnails/' . ltrim($relativePath, '/');
    }

    /**
     * Ensure required directories exist
     */
    private function ensureDirectories(): void
    {
        $directories = [
            $this->config['thumbnails_path'],
            $this->config['temp_path']
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
}
