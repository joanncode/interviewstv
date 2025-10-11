<?php

namespace App\Services;

use Exception;

class VideoMetadataService
{
    private $config;
    private $pdo;

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->config = [
            'ffprobe_path' => '/usr/bin/ffprobe',
            'mediainfo_path' => '/usr/bin/mediainfo',
            'timeout' => 30, // seconds
            'supported_formats' => ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'm4v']
        ];
    }

    /**
     * Extract comprehensive metadata from video file
     */
    public function extractMetadata(string $videoPath, string $recordingId = null): array
    {
        try {
            if (!file_exists($videoPath)) {
                throw new Exception('Video file does not exist');
            }

            $fileInfo = pathinfo($videoPath);
            $extension = strtolower($fileInfo['extension'] ?? '');
            
            if (!in_array($extension, $this->config['supported_formats'])) {
                throw new Exception('Unsupported video format: ' . $extension);
            }

            // Extract metadata using FFprobe
            $ffprobeData = $this->extractWithFFprobe($videoPath);
            
            // Extract additional metadata using MediaInfo if available
            $mediainfoData = $this->extractWithMediaInfo($videoPath);
            
            // Combine and normalize metadata
            $metadata = $this->normalizeMetadata($ffprobeData, $mediainfoData, $videoPath);
            
            // Store metadata in database if recording ID provided
            if ($recordingId) {
                $this->storeMetadata($recordingId, $metadata);
            }

            return [
                'success' => true,
                'data' => $metadata
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Extract metadata using FFprobe
     */
    private function extractWithFFprobe(string $videoPath): array
    {
        $command = sprintf(
            '%s -v quiet -print_format json -show_format -show_streams "%s" 2>&1',
            $this->config['ffprobe_path'],
            $videoPath
        );

        $output = $this->executeCommand($command);
        $data = json_decode($output, true);

        if (!$data) {
            throw new Exception('Failed to parse FFprobe output');
        }

        return $data;
    }

    /**
     * Extract metadata using MediaInfo (if available)
     */
    private function extractWithMediaInfo(string $videoPath): ?array
    {
        if (!file_exists($this->config['mediainfo_path'])) {
            return null;
        }

        $command = sprintf(
            '%s --Output=JSON "%s" 2>&1',
            $this->config['mediainfo_path'],
            $videoPath
        );

        try {
            $output = $this->executeCommand($command);
            return json_decode($output, true);
        } catch (Exception $e) {
            // MediaInfo is optional, continue without it
            return null;
        }
    }

    /**
     * Normalize and combine metadata from different sources
     */
    private function normalizeMetadata(array $ffprobeData, ?array $mediainfoData, string $videoPath): array
    {
        $fileStats = stat($videoPath);
        $fileInfo = pathinfo($videoPath);
        
        // Initialize metadata structure
        $metadata = [
            'file' => [
                'filename' => $fileInfo['basename'],
                'size' => filesize($videoPath),
                'format' => strtolower($fileInfo['extension'] ?? ''),
                'mime_type' => mime_content_type($videoPath),
                'created_at' => date('Y-m-d H:i:s', $fileStats['ctime']),
                'modified_at' => date('Y-m-d H:i:s', $fileStats['mtime'])
            ],
            'video' => [],
            'audio' => [],
            'container' => [],
            'technical' => []
        ];

        // Extract container/format information
        if (isset($ffprobeData['format'])) {
            $format = $ffprobeData['format'];
            $metadata['container'] = [
                'format_name' => $format['format_name'] ?? null,
                'format_long_name' => $format['format_long_name'] ?? null,
                'duration' => isset($format['duration']) ? (float)$format['duration'] : null,
                'bitrate' => isset($format['bit_rate']) ? (int)$format['bit_rate'] : null,
                'tags' => $format['tags'] ?? []
            ];
        }

        // Extract video stream information
        $videoStreams = array_filter($ffprobeData['streams'] ?? [], function($stream) {
            return $stream['codec_type'] === 'video';
        });

        if (!empty($videoStreams)) {
            $videoStream = reset($videoStreams);
            $metadata['video'] = [
                'codec' => $videoStream['codec_name'] ?? null,
                'codec_long_name' => $videoStream['codec_long_name'] ?? null,
                'profile' => $videoStream['profile'] ?? null,
                'width' => isset($videoStream['width']) ? (int)$videoStream['width'] : null,
                'height' => isset($videoStream['height']) ? (int)$videoStream['height'] : null,
                'aspect_ratio' => $videoStream['display_aspect_ratio'] ?? null,
                'pixel_format' => $videoStream['pix_fmt'] ?? null,
                'frame_rate' => $this->parseFrameRate($videoStream['r_frame_rate'] ?? null),
                'bitrate' => isset($videoStream['bit_rate']) ? (int)$videoStream['bit_rate'] : null,
                'duration' => isset($videoStream['duration']) ? (float)$videoStream['duration'] : null,
                'tags' => $videoStream['tags'] ?? []
            ];
        }

        // Extract audio stream information
        $audioStreams = array_filter($ffprobeData['streams'] ?? [], function($stream) {
            return $stream['codec_type'] === 'audio';
        });

        if (!empty($audioStreams)) {
            $audioStream = reset($audioStreams);
            $metadata['audio'] = [
                'codec' => $audioStream['codec_name'] ?? null,
                'codec_long_name' => $audioStream['codec_long_name'] ?? null,
                'sample_rate' => isset($audioStream['sample_rate']) ? (int)$audioStream['sample_rate'] : null,
                'channels' => isset($audioStream['channels']) ? (int)$audioStream['channels'] : null,
                'channel_layout' => $audioStream['channel_layout'] ?? null,
                'bitrate' => isset($audioStream['bit_rate']) ? (int)$audioStream['bit_rate'] : null,
                'duration' => isset($audioStream['duration']) ? (float)$audioStream['duration'] : null,
                'tags' => $audioStream['tags'] ?? []
            ];
        }

        // Add technical information
        $metadata['technical'] = [
            'total_streams' => count($ffprobeData['streams'] ?? []),
            'video_streams' => count($videoStreams),
            'audio_streams' => count($audioStreams),
            'has_video' => !empty($videoStreams),
            'has_audio' => !empty($audioStreams),
            'extraction_tool' => 'ffprobe',
            'extraction_date' => date('Y-m-d H:i:s')
        ];

        // Add MediaInfo data if available
        if ($mediainfoData) {
            $metadata['technical']['mediainfo_available'] = true;
            $metadata['mediainfo'] = $mediainfoData;
        }

        return $metadata;
    }

    /**
     * Store metadata in database
     */
    private function storeMetadata(string $recordingId, array $metadata): void
    {
        // Update video_files table with extracted metadata
        $stmt = $this->pdo->prepare("
            UPDATE video_files 
            SET 
                duration = ?,
                width = ?,
                height = ?,
                bitrate = ?,
                framerate = ?,
                codec = ?,
                metadata = ?,
                processing_status = 'metadata_extracted',
                updated_at = CURRENT_TIMESTAMP
            WHERE recording_id = ?
        ");

        $stmt->execute([
            $metadata['container']['duration'] ?? null,
            $metadata['video']['width'] ?? null,
            $metadata['video']['height'] ?? null,
            $metadata['container']['bitrate'] ?? $metadata['video']['bitrate'] ?? null,
            $metadata['video']['frame_rate'] ?? null,
            $metadata['video']['codec'] ?? null,
            json_encode($metadata),
            $recordingId
        ]);
    }

    /**
     * Get stored metadata for a recording
     */
    public function getStoredMetadata(string $recordingId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT metadata, duration, width, height, bitrate, framerate, codec
            FROM video_files 
            WHERE recording_id = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$recordingId]);
        $result = $stmt->fetch();

        if (!$result) {
            return [
                'success' => false,
                'message' => 'No metadata found for recording'
            ];
        }

        $metadata = json_decode($result['metadata'], true) ?? [];
        
        return [
            'success' => true,
            'data' => [
                'recording_id' => $recordingId,
                'basic_info' => [
                    'duration' => $result['duration'],
                    'width' => $result['width'],
                    'height' => $result['height'],
                    'bitrate' => $result['bitrate'],
                    'framerate' => $result['framerate'],
                    'codec' => $result['codec']
                ],
                'full_metadata' => $metadata
            ]
        ];
    }

    /**
     * Batch extract metadata for multiple videos
     */
    public function batchExtractMetadata(array $videoPaths): array
    {
        $results = [];
        $errors = [];

        foreach ($videoPaths as $path => $recordingId) {
            $result = $this->extractMetadata($path, $recordingId);
            
            if ($result['success']) {
                $results[$recordingId] = $result['data'];
            } else {
                $errors[$recordingId] = $result['message'];
            }
        }

        return [
            'success' => count($results) > 0,
            'data' => [
                'processed' => count($results),
                'failed' => count($errors),
                'results' => $results,
                'errors' => $errors
            ]
        ];
    }

    /**
     * Get video quality assessment
     */
    public function assessVideoQuality(string $videoPath): array
    {
        try {
            $metadata = $this->extractMetadata($videoPath);
            
            if (!$metadata['success']) {
                throw new Exception('Failed to extract metadata');
            }

            $data = $metadata['data'];
            $assessment = [
                'overall_score' => 0,
                'resolution_score' => 0,
                'bitrate_score' => 0,
                'framerate_score' => 0,
                'audio_score' => 0,
                'recommendations' => []
            ];

            // Assess resolution
            $width = $data['video']['width'] ?? 0;
            $height = $data['video']['height'] ?? 0;
            
            if ($height >= 1080) {
                $assessment['resolution_score'] = 100;
            } elseif ($height >= 720) {
                $assessment['resolution_score'] = 80;
            } elseif ($height >= 480) {
                $assessment['resolution_score'] = 60;
            } else {
                $assessment['resolution_score'] = 40;
                $assessment['recommendations'][] = 'Consider recording at higher resolution (720p or 1080p)';
            }

            // Assess bitrate
            $bitrate = $data['video']['bitrate'] ?? 0;
            $pixels = $width * $height;
            $bitratePerPixel = $pixels > 0 ? $bitrate / $pixels : 0;

            if ($bitratePerPixel > 0.1) {
                $assessment['bitrate_score'] = 100;
            } elseif ($bitratePerPixel > 0.05) {
                $assessment['bitrate_score'] = 80;
            } else {
                $assessment['bitrate_score'] = 60;
                $assessment['recommendations'][] = 'Video bitrate could be higher for better quality';
            }

            // Assess frame rate
            $framerate = $data['video']['frame_rate'] ?? 0;
            if ($framerate >= 30) {
                $assessment['framerate_score'] = 100;
            } elseif ($framerate >= 24) {
                $assessment['framerate_score'] = 80;
            } else {
                $assessment['framerate_score'] = 60;
                $assessment['recommendations'][] = 'Frame rate could be higher (30fps recommended)';
            }

            // Assess audio
            if (!empty($data['audio'])) {
                $audioSampleRate = $data['audio']['sample_rate'] ?? 0;
                $audioBitrate = $data['audio']['bitrate'] ?? 0;
                
                if ($audioSampleRate >= 44100 && $audioBitrate >= 128000) {
                    $assessment['audio_score'] = 100;
                } elseif ($audioSampleRate >= 22050 && $audioBitrate >= 64000) {
                    $assessment['audio_score'] = 80;
                } else {
                    $assessment['audio_score'] = 60;
                    $assessment['recommendations'][] = 'Audio quality could be improved';
                }
            } else {
                $assessment['audio_score'] = 0;
                $assessment['recommendations'][] = 'No audio track detected';
            }

            // Calculate overall score
            $assessment['overall_score'] = round(
                ($assessment['resolution_score'] + 
                 $assessment['bitrate_score'] + 
                 $assessment['framerate_score'] + 
                 $assessment['audio_score']) / 4
            );

            return [
                'success' => true,
                'data' => $assessment
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Parse frame rate from FFprobe format
     */
    private function parseFrameRate(?string $frameRate): ?float
    {
        if (!$frameRate) return null;
        
        if (strpos($frameRate, '/') !== false) {
            $parts = explode('/', $frameRate);
            if (count($parts) === 2 && $parts[1] != 0) {
                return round((float)$parts[0] / (float)$parts[1], 2);
            }
        }
        
        return (float)$frameRate;
    }

    /**
     * Execute command with timeout
     */
    private function executeCommand(string $command): string
    {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        $process = proc_open($command, $descriptors, $pipes);
        
        if (!is_resource($process)) {
            throw new Exception('Failed to execute command');
        }

        fclose($pipes[0]);
        
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        
        fclose($pipes[1]);
        fclose($pipes[2]);
        
        $returnCode = proc_close($process);
        
        if ($returnCode !== 0) {
            throw new Exception('Command failed: ' . $error);
        }
        
        return $output;
    }
}
