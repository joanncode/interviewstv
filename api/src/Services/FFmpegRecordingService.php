<?php

namespace App\Services;

use Exception;

class FFmpegRecordingService
{
    private $config;
    private $activeProcesses;

    public function __construct()
    {
        $this->config = [
            'ffmpeg_path' => '/usr/bin/ffmpeg', // Adjust path as needed
            'recordings_path' => __DIR__ . '/../../recordings/',
            'temp_path' => __DIR__ . '/../../temp/',
            'rtmp_base_url' => 'rtmp://localhost:1935/live/',
            'hls_base_url' => 'http://localhost:8080/hls/',
            'default_quality' => '720p',
            'video_codec' => 'libx264',
            'audio_codec' => 'aac',
            'segment_duration' => 10, // HLS segment duration in seconds
            'max_recording_duration' => 7200 // 2 hours
        ];

        $this->activeProcesses = [];

        // Ensure directories exist
        $this->ensureDirectories();
    }

    /**
     * Start server-side recording from RTMP stream
     */
    public function startRTMPRecording(string $recordingId, string $streamKey, array $options = []): array
    {
        try {
            $quality = $options['quality'] ?? $this->config['default_quality'];
            $format = $options['format'] ?? 'mp4';
            
            $inputUrl = $this->config['rtmp_base_url'] . $streamKey;
            $outputPath = $this->config['recordings_path'] . $recordingId . '.' . $format;
            
            // Build FFmpeg command
            $command = $this->buildRecordingCommand($inputUrl, $outputPath, $quality, $format);
            
            // Start FFmpeg process
            $process = $this->startFFmpegProcess($command, $recordingId);
            
            if ($process) {
                $this->activeProcesses[$recordingId] = $process;
                
                return [
                    'success' => true,
                    'data' => [
                        'recording_id' => $recordingId,
                        'input_url' => $inputUrl,
                        'output_path' => $outputPath,
                        'process_id' => $process['pid'],
                        'command' => $command
                    ]
                ];
            } else {
                throw new Exception('Failed to start FFmpeg process');
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Start HLS recording for live streaming
     */
    public function startHLSRecording(string $recordingId, string $streamKey, array $options = []): array
    {
        try {
            $quality = $options['quality'] ?? $this->config['default_quality'];
            
            $inputUrl = $this->config['rtmp_base_url'] . $streamKey;
            $hlsPath = $this->config['recordings_path'] . 'hls/' . $recordingId;
            
            // Ensure HLS directory exists
            if (!is_dir($hlsPath)) {
                mkdir($hlsPath, 0755, true);
            }
            
            $playlistPath = $hlsPath . '/playlist.m3u8';
            $segmentPath = $hlsPath . '/segment_%03d.ts';
            
            // Build HLS FFmpeg command
            $command = $this->buildHLSCommand($inputUrl, $playlistPath, $segmentPath, $quality);
            
            // Start FFmpeg process
            $process = $this->startFFmpegProcess($command, $recordingId . '_hls');
            
            if ($process) {
                $this->activeProcesses[$recordingId . '_hls'] = $process;
                
                return [
                    'success' => true,
                    'data' => [
                        'recording_id' => $recordingId,
                        'hls_url' => $this->config['hls_base_url'] . $recordingId . '/playlist.m3u8',
                        'playlist_path' => $playlistPath,
                        'process_id' => $process['pid']
                    ]
                ];
            } else {
                throw new Exception('Failed to start HLS FFmpeg process');
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Process uploaded recording chunks
     */
    public function processRecordingChunks(string $recordingId, string $chunksDir): array
    {
        try {
            $outputPath = $this->config['recordings_path'] . $recordingId . '.mp4';
            
            // Get all chunk files
            $chunkFiles = glob($chunksDir . '/chunk_*.webm');
            if (empty($chunkFiles)) {
                throw new Exception('No chunk files found');
            }
            
            // Sort chunks by index
            usort($chunkFiles, function($a, $b) {
                preg_match('/chunk_(\d+)\.webm$/', $a, $matchesA);
                preg_match('/chunk_(\d+)\.webm$/', $b, $matchesB);
                return (int)$matchesA[1] - (int)$matchesB[1];
            });
            
            // Create concat file list
            $concatFile = $this->config['temp_path'] . $recordingId . '_concat.txt';
            $concatContent = '';
            foreach ($chunkFiles as $chunkFile) {
                $concatContent .= "file '" . realpath($chunkFile) . "'\n";
            }
            file_put_contents($concatFile, $concatContent);
            
            // Build concat command
            $command = sprintf(
                '%s -f concat -safe 0 -i "%s" -c copy "%s" 2>&1',
                $this->config['ffmpeg_path'],
                $concatFile,
                $outputPath
            );
            
            // Execute concat command
            $output = [];
            $returnCode = 0;
            exec($command, $output, $returnCode);
            
            // Clean up
            unlink($concatFile);
            
            if ($returnCode === 0 && file_exists($outputPath)) {
                // Clean up chunk files
                foreach ($chunkFiles as $chunkFile) {
                    unlink($chunkFile);
                }
                rmdir($chunksDir);
                
                return [
                    'success' => true,
                    'data' => [
                        'recording_id' => $recordingId,
                        'output_path' => $outputPath,
                        'file_size' => filesize($outputPath),
                        'chunks_processed' => count($chunkFiles)
                    ]
                ];
            } else {
                throw new Exception('FFmpeg concat failed: ' . implode('\n', $output));
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Stop recording process
     */
    public function stopRecording(string $recordingId): array
    {
        try {
            if (!isset($this->activeProcesses[$recordingId])) {
                throw new Exception('No active recording process found');
            }
            
            $process = $this->activeProcesses[$recordingId];
            
            // Send SIGTERM to gracefully stop FFmpeg
            if (is_resource($process['process'])) {
                proc_terminate($process['process'], SIGTERM);
                
                // Wait for process to finish
                $status = proc_get_status($process['process']);
                $timeout = 10; // 10 seconds timeout
                $start = time();
                
                while ($status['running'] && (time() - $start) < $timeout) {
                    sleep(1);
                    $status = proc_get_status($process['process']);
                }
                
                // Force kill if still running
                if ($status['running']) {
                    proc_terminate($process['process'], SIGKILL);
                }
                
                proc_close($process['process']);
            }
            
            unset($this->activeProcesses[$recordingId]);
            
            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'stopped_at' => date('Y-m-d H:i:s')
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
     * Get recording process status
     */
    public function getRecordingStatus(string $recordingId): array
    {
        if (!isset($this->activeProcesses[$recordingId])) {
            return [
                'success' => true,
                'data' => [
                    'recording_id' => $recordingId,
                    'status' => 'not_found'
                ]
            ];
        }
        
        $process = $this->activeProcesses[$recordingId];
        $status = proc_get_status($process['process']);
        
        return [
            'success' => true,
            'data' => [
                'recording_id' => $recordingId,
                'status' => $status['running'] ? 'recording' : 'stopped',
                'pid' => $status['pid'],
                'command' => $process['command'],
                'started_at' => $process['started_at']
            ]
        ];
    }

    /**
     * Build FFmpeg recording command
     */
    private function buildRecordingCommand(string $inputUrl, string $outputPath, string $quality, string $format): string
    {
        $videoSettings = $this->getVideoSettings($quality);
        
        $command = sprintf(
            '%s -i "%s" -c:v %s -c:a %s %s -f %s "%s" 2>&1',
            $this->config['ffmpeg_path'],
            $inputUrl,
            $this->config['video_codec'],
            $this->config['audio_codec'],
            $videoSettings,
            $format,
            $outputPath
        );
        
        return $command;
    }

    /**
     * Build HLS FFmpeg command
     */
    private function buildHLSCommand(string $inputUrl, string $playlistPath, string $segmentPath, string $quality): string
    {
        $videoSettings = $this->getVideoSettings($quality);
        
        $command = sprintf(
            '%s -i "%s" -c:v %s -c:a %s %s -f hls -hls_time %d -hls_list_size 0 -hls_segment_filename "%s" "%s" 2>&1',
            $this->config['ffmpeg_path'],
            $inputUrl,
            $this->config['video_codec'],
            $this->config['audio_codec'],
            $videoSettings,
            $this->config['segment_duration'],
            $segmentPath,
            $playlistPath
        );
        
        return $command;
    }

    /**
     * Get video settings for quality
     */
    private function getVideoSettings(string $quality): string
    {
        switch ($quality) {
            case '1080p':
                return '-s 1920x1080 -b:v 4000k -maxrate 4000k -bufsize 8000k';
            case '720p':
                return '-s 1280x720 -b:v 2500k -maxrate 2500k -bufsize 5000k';
            case '480p':
                return '-s 854x480 -b:v 1000k -maxrate 1000k -bufsize 2000k';
            case '360p':
                return '-s 640x360 -b:v 600k -maxrate 600k -bufsize 1200k';
            default:
                return '-s 1280x720 -b:v 2500k -maxrate 2500k -bufsize 5000k';
        }
    }

    /**
     * Start FFmpeg process
     */
    private function startFFmpegProcess(string $command, string $recordingId): ?array
    {
        $descriptors = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w']  // stderr
        ];
        
        $process = proc_open($command, $descriptors, $pipes);
        
        if (is_resource($process)) {
            // Make stdout and stderr non-blocking
            stream_set_blocking($pipes[1], false);
            stream_set_blocking($pipes[2], false);
            
            return [
                'process' => $process,
                'pipes' => $pipes,
                'command' => $command,
                'started_at' => date('Y-m-d H:i:s'),
                'pid' => proc_get_status($process)['pid']
            ];
        }
        
        return null;
    }

    /**
     * Ensure required directories exist
     */
    private function ensureDirectories(): void
    {
        $directories = [
            $this->config['recordings_path'],
            $this->config['temp_path'],
            $this->config['recordings_path'] . 'hls/'
        ];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    /**
     * Check if FFmpeg is available
     */
    public function checkFFmpegAvailability(): array
    {
        $command = $this->config['ffmpeg_path'] . ' -version 2>&1';
        $output = [];
        $returnCode = 0;
        
        exec($command, $output, $returnCode);
        
        return [
            'available' => $returnCode === 0,
            'version' => $returnCode === 0 ? $output[0] : null,
            'path' => $this->config['ffmpeg_path']
        ];
    }

    /**
     * Cleanup old recordings
     */
    public function cleanupOldRecordings(int $daysOld = 30): array
    {
        $cutoffTime = time() - ($daysOld * 24 * 60 * 60);
        $deletedFiles = [];
        $totalSize = 0;
        
        $files = glob($this->config['recordings_path'] . '*');
        
        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoffTime) {
                $size = filesize($file);
                if (unlink($file)) {
                    $deletedFiles[] = basename($file);
                    $totalSize += $size;
                }
            }
        }
        
        return [
            'success' => true,
            'data' => [
                'deleted_files' => count($deletedFiles),
                'total_size_freed' => $totalSize,
                'files' => $deletedFiles
            ]
        ];
    }

    /**
     * Destructor - cleanup active processes
     */
    public function __destruct()
    {
        foreach ($this->activeProcesses as $recordingId => $process) {
            if (is_resource($process['process'])) {
                proc_terminate($process['process']);
                proc_close($process['process']);
            }
        }
    }
}
