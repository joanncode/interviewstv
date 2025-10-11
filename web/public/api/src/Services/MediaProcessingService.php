<?php

namespace App\Services;

class MediaProcessingService
{
    protected $ffmpegPath;
    protected $tempPath;
    protected $outputPath;
    
    public function __construct()
    {
        $this->ffmpegPath = env('FFMPEG_PATH', '/usr/bin/ffmpeg');
        $this->tempPath = storage_path('temp');
        $this->outputPath = storage_path('processed');
        
        // Create directories if they don't exist
        if (!is_dir($this->tempPath)) {
            mkdir($this->tempPath, 0755, true);
        }
        if (!is_dir($this->outputPath)) {
            mkdir($this->outputPath, 0755, true);
        }
    }
    
    /**
     * Process video file - extract metadata, generate thumbnail, create preview
     */
    public function processVideo($inputPath, $outputDir = null)
    {
        if (!$outputDir) {
            $outputDir = $this->outputPath;
        }
        
        $result = [
            'success' => false,
            'metadata' => null,
            'thumbnail' => null,
            'preview' => null,
            'compressed' => null,
            'error' => null
        ];
        
        try {
            // Extract metadata
            $metadata = $this->extractVideoMetadata($inputPath);
            $result['metadata'] = $metadata;
            
            $filename = pathinfo($inputPath, PATHINFO_FILENAME);
            
            // Generate thumbnail at 10% of video duration
            $thumbnailTime = max(1, floor($metadata['duration'] * 0.1));
            $thumbnailPath = $outputDir . '/' . $filename . '_thumb.jpg';
            
            if ($this->generateVideoThumbnail($inputPath, $thumbnailPath, $thumbnailTime)) {
                $result['thumbnail'] = $thumbnailPath;
            }
            
            // Create compressed version for web
            $compressedPath = $outputDir . '/' . $filename . '_compressed.mp4';
            if ($this->compressVideo($inputPath, $compressedPath)) {
                $result['compressed'] = $compressedPath;
            }
            
            // Generate preview clip (first 30 seconds)
            if ($metadata['duration'] > 30) {
                $previewPath = $outputDir . '/' . $filename . '_preview.mp4';
                if ($this->generateVideoPreview($inputPath, $previewPath, 30)) {
                    $result['preview'] = $previewPath;
                }
            }
            
            $result['success'] = true;
            
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }
        
        return $result;
    }
    
    /**
     * Process audio file - extract metadata, generate waveform
     */
    public function processAudio($inputPath, $outputDir = null)
    {
        if (!$outputDir) {
            $outputDir = $this->outputPath;
        }
        
        $result = [
            'success' => false,
            'metadata' => null,
            'waveform' => null,
            'compressed' => null,
            'error' => null
        ];
        
        try {
            // Extract metadata
            $metadata = $this->extractAudioMetadata($inputPath);
            $result['metadata'] = $metadata;
            
            $filename = pathinfo($inputPath, PATHINFO_FILENAME);
            
            // Generate waveform image
            $waveformPath = $outputDir . '/' . $filename . '_waveform.png';
            if ($this->generateAudioWaveform($inputPath, $waveformPath)) {
                $result['waveform'] = $waveformPath;
            }
            
            // Create compressed version
            $compressedPath = $outputDir . '/' . $filename . '_compressed.mp3';
            if ($this->compressAudio($inputPath, $compressedPath)) {
                $result['compressed'] = $compressedPath;
            }
            
            $result['success'] = true;
            
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }
        
        return $result;
    }
    
    /**
     * Extract video metadata using ffprobe
     */
    protected function extractVideoMetadata($inputPath)
    {
        $cmd = "ffprobe -v quiet -print_format json -show_format -show_streams " . escapeshellarg($inputPath);
        $output = shell_exec($cmd);
        
        if (!$output) {
            throw new \Exception('Failed to extract video metadata');
        }
        
        $data = json_decode($output, true);
        
        if (!$data) {
            throw new \Exception('Invalid metadata format');
        }
        
        $videoStream = null;
        $audioStream = null;
        
        foreach ($data['streams'] as $stream) {
            if ($stream['codec_type'] === 'video' && !$videoStream) {
                $videoStream = $stream;
            } elseif ($stream['codec_type'] === 'audio' && !$audioStream) {
                $audioStream = $stream;
            }
        }
        
        return [
            'duration' => (float) $data['format']['duration'],
            'size' => (int) $data['format']['size'],
            'bitrate' => (int) $data['format']['bit_rate'],
            'width' => $videoStream ? (int) $videoStream['width'] : null,
            'height' => $videoStream ? (int) $videoStream['height'] : null,
            'fps' => $videoStream ? $this->parseFps($videoStream['r_frame_rate']) : null,
            'video_codec' => $videoStream ? $videoStream['codec_name'] : null,
            'audio_codec' => $audioStream ? $audioStream['codec_name'] : null,
            'has_audio' => $audioStream !== null
        ];
    }
    
    /**
     * Extract audio metadata using ffprobe
     */
    protected function extractAudioMetadata($inputPath)
    {
        $cmd = "ffprobe -v quiet -print_format json -show_format -show_streams " . escapeshellarg($inputPath);
        $output = shell_exec($cmd);
        
        if (!$output) {
            throw new \Exception('Failed to extract audio metadata');
        }
        
        $data = json_decode($output, true);
        
        if (!$data) {
            throw new \Exception('Invalid metadata format');
        }
        
        $audioStream = $data['streams'][0] ?? null;
        
        return [
            'duration' => (float) $data['format']['duration'],
            'size' => (int) $data['format']['size'],
            'bitrate' => (int) $data['format']['bit_rate'],
            'sample_rate' => $audioStream ? (int) $audioStream['sample_rate'] : null,
            'channels' => $audioStream ? (int) $audioStream['channels'] : null,
            'codec' => $audioStream ? $audioStream['codec_name'] : null
        ];
    }
    
    /**
     * Generate video thumbnail
     */
    protected function generateVideoThumbnail($inputPath, $outputPath, $timeSeconds = 1)
    {
        $cmd = sprintf(
            '%s -i %s -ss %d -vframes 1 -q:v 2 -y %s 2>&1',
            $this->ffmpegPath,
            escapeshellarg($inputPath),
            $timeSeconds,
            escapeshellarg($outputPath)
        );
        
        $output = shell_exec($cmd);
        
        return file_exists($outputPath);
    }
    
    /**
     * Compress video for web delivery
     */
    protected function compressVideo($inputPath, $outputPath)
    {
        $cmd = sprintf(
            '%s -i %s -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart -y %s 2>&1',
            $this->ffmpegPath,
            escapeshellarg($inputPath),
            escapeshellarg($outputPath)
        );
        
        $output = shell_exec($cmd);
        
        return file_exists($outputPath);
    }
    
    /**
     * Generate video preview clip
     */
    protected function generateVideoPreview($inputPath, $outputPath, $durationSeconds = 30)
    {
        $cmd = sprintf(
            '%s -i %s -t %d -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart -y %s 2>&1',
            $this->ffmpegPath,
            escapeshellarg($inputPath),
            $durationSeconds,
            escapeshellarg($outputPath)
        );
        
        $output = shell_exec($cmd);
        
        return file_exists($outputPath);
    }
    
    /**
     * Generate audio waveform image
     */
    protected function generateAudioWaveform($inputPath, $outputPath)
    {
        $cmd = sprintf(
            '%s -i %s -filter_complex "showwavespic=s=1200x200:colors=0x3b82f6" -frames:v 1 -y %s 2>&1',
            $this->ffmpegPath,
            escapeshellarg($inputPath),
            escapeshellarg($outputPath)
        );
        
        $output = shell_exec($cmd);
        
        return file_exists($outputPath);
    }
    
    /**
     * Compress audio for web delivery
     */
    protected function compressAudio($inputPath, $outputPath)
    {
        $cmd = sprintf(
            '%s -i %s -c:a mp3 -b:a 128k -y %s 2>&1',
            $this->ffmpegPath,
            escapeshellarg($inputPath),
            escapeshellarg($outputPath)
        );
        
        $output = shell_exec($cmd);
        
        return file_exists($outputPath);
    }
    
    /**
     * Parse frame rate from ffprobe output
     */
    protected function parseFps($frameRate)
    {
        if (strpos($frameRate, '/') !== false) {
            list($num, $den) = explode('/', $frameRate);
            return $den > 0 ? round($num / $den, 2) : 0;
        }
        
        return (float) $frameRate;
    }
    
    /**
     * Check if FFmpeg is available
     */
    public function isAvailable()
    {
        $output = shell_exec($this->ffmpegPath . ' -version 2>&1');
        return strpos($output, 'ffmpeg version') !== false;
    }
}
