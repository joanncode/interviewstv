<?php

namespace App\Controllers;

use App\Services\TranscriptionService;
use App\Http\Response;

/**
 * Transcription Controller
 * Handles real-time and post-processing transcription operations
 */
class TranscriptionController
{
    private $transcriptionService;

    public function __construct()
    {
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->transcriptionService = new TranscriptionService($pdo);
    }

    /**
     * Start real-time transcription for an interview
     * POST /api/transcription/start/{interviewId}
     */
    public function startTranscription($interviewId)
    {
        try {
            $options = [
                'language' => $_POST['language'] ?? 'en',
                'engine' => $_POST['engine'] ?? 'web_speech_api',
                'auto_punctuation' => $_POST['auto_punctuation'] ?? true,
                'speaker_identification' => $_POST['speaker_identification'] ?? true
            ];
            
            $result = $this->transcriptionService->startRealtimeTranscription($interviewId, $options);
            
            return Response::success($result, 'Transcription started successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to start transcription: ' . $e->getMessage());
        }
    }

    /**
     * Process real-time transcription segment
     * POST /api/transcription/segment/{interviewId}
     */
    public function processSegment($interviewId)
    {
        try {
            $segmentData = [
                'speaker_id' => $_POST['speaker_id'] ?? null,
                'text' => $_POST['text'] ?? '',
                'confidence' => (float)($_POST['confidence'] ?? 0.0),
                'is_final' => $_POST['is_final'] === 'true' || $_POST['is_final'] === true,
                'timestamp_offset' => (float)($_POST['timestamp_offset'] ?? 0.0),
                'session_id' => $_POST['session_id'] ?? uniqid()
            ];
            
            if (empty($segmentData['text'])) {
                return Response::error('Text content is required');
            }
            
            $result = $this->transcriptionService->processRealtimeSegment($interviewId, $segmentData);
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Failed to process segment: ' . $e->getMessage());
        }
    }

    /**
     * Get real-time transcription
     * GET /api/transcription/realtime/{interviewId}
     */
    public function getRealtimeTranscription($interviewId)
    {
        try {
            $options = [
                'include_interim' => $_GET['include_interim'] === 'true',
                'since_timestamp' => (float)($_GET['since_timestamp'] ?? 0),
                'speaker_id' => $_GET['speaker_id'] ?? null
            ];
            
            $result = $this->transcriptionService->getRealtimeTranscription($interviewId, $options);
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get real-time transcription: ' . $e->getMessage());
        }
    }

    /**
     * Complete transcription processing
     * POST /api/transcription/complete/{interviewId}
     */
    public function completeTranscription($interviewId)
    {
        try {
            $result = $this->transcriptionService->completeTranscription($interviewId);
            
            return Response::success($result, 'Transcription completed successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to complete transcription: ' . $e->getMessage());
        }
    }

    /**
     * Get transcription for an interview
     * GET /api/transcription/{interviewId}
     */
    public function getTranscription($interviewId)
    {
        try {
            $options = [
                'include_segments' => $_GET['include_segments'] !== 'false',
                'include_analytics' => $_GET['include_analytics'] !== 'false',
                'format' => $_GET['format'] ?? 'structured' // structured, plain, srt, vtt
            ];
            
            $result = $this->transcriptionService->getTranscription($interviewId, $options);
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get transcription: ' . $e->getMessage());
        }
    }

    /**
     * Search transcription content
     * GET /api/transcription/{interviewId}/search
     */
    public function searchTranscription($interviewId)
    {
        try {
            $query = $_GET['q'] ?? '';
            
            if (empty($query)) {
                return Response::error('Search query is required');
            }
            
            $options = [
                'case_sensitive' => $_GET['case_sensitive'] === 'true',
                'whole_words' => $_GET['whole_words'] === 'true',
                'speaker_id' => $_GET['speaker_id'] ?? null,
                'time_range' => isset($_GET['start_time'], $_GET['end_time']) 
                    ? [(float)$_GET['start_time'], (float)$_GET['end_time']] 
                    : null
            ];
            
            $result = $this->transcriptionService->searchTranscription($interviewId, $query, $options);
            
            return Response::success($result);
            
        } catch (\Exception $e) {
            return Response::error('Failed to search transcription: ' . $e->getMessage());
        }
    }

    /**
     * Update transcription settings
     * PUT /api/transcription/{interviewId}/settings
     */
    public function updateSettings($interviewId)
    {
        try {
            $settings = [
                'auto_transcription' => $_POST['auto_transcription'] ?? null,
                'language_preference' => $_POST['language_preference'] ?? null,
                'transcription_engine' => $_POST['transcription_engine'] ?? null,
                'real_time_display' => $_POST['real_time_display'] ?? null,
                'speaker_identification' => $_POST['speaker_identification'] ?? null,
                'profanity_filter' => $_POST['profanity_filter'] ?? null,
                'punctuation_auto' => $_POST['punctuation_auto'] ?? null,
                'confidence_threshold' => $_POST['confidence_threshold'] ?? null
            ];
            
            // Remove null values
            $settings = array_filter($settings, function($value) {
                return $value !== null;
            });
            
            if (empty($settings)) {
                return Response::error('No valid settings provided');
            }
            
            $result = $this->transcriptionService->updateTranscriptionSettings($interviewId, $settings);
            
            return Response::success($result, 'Settings updated successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to update settings: ' . $e->getMessage());
        }
    }

    /**
     * Get transcription settings
     * GET /api/transcription/{interviewId}/settings
     */
    public function getSettings($interviewId)
    {
        try {
            // This would call a method to get settings from the service
            $settings = $this->getTranscriptionSettings($interviewId);
            
            return Response::success($settings);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get settings: ' . $e->getMessage());
        }
    }

    /**
     * Export transcription in various formats
     * GET /api/transcription/{interviewId}/export
     */
    public function exportTranscription($interviewId)
    {
        try {
            $format = $_GET['format'] ?? 'txt';
            $includeTimestamps = $_GET['include_timestamps'] === 'true';
            $includeSpeakers = $_GET['include_speakers'] === 'true';
            
            $transcription = $this->transcriptionService->getTranscription($interviewId, [
                'include_segments' => true,
                'format' => 'structured'
            ]);
            
            if (!$transcription['exists']) {
                return Response::error('No transcription found for this interview', 404);
            }
            
            $exportData = $this->formatTranscriptionExport(
                $transcription, 
                $format, 
                $includeTimestamps, 
                $includeSpeakers
            );
            
            // Set appropriate headers for download
            $filename = "interview_{$interviewId}_transcript.{$format}";
            
            switch ($format) {
                case 'txt':
                    header('Content-Type: text/plain');
                    break;
                case 'srt':
                    header('Content-Type: application/x-subrip');
                    break;
                case 'vtt':
                    header('Content-Type: text/vtt');
                    break;
                case 'json':
                    header('Content-Type: application/json');
                    break;
                default:
                    header('Content-Type: text/plain');
            }
            
            header("Content-Disposition: attachment; filename=\"{$filename}\"");
            header('Content-Length: ' . strlen($exportData));
            
            echo $exportData;
            exit;
            
        } catch (\Exception $e) {
            return Response::error('Failed to export transcription: ' . $e->getMessage());
        }
    }

    /**
     * Get transcription statistics
     * GET /api/transcription/{interviewId}/stats
     */
    public function getTranscriptionStats($interviewId)
    {
        try {
            $transcription = $this->transcriptionService->getTranscription($interviewId, [
                'include_segments' => true,
                'include_analytics' => true
            ]);
            
            if (!$transcription['exists']) {
                return Response::error('No transcription found for this interview', 404);
            }
            
            $stats = [
                'word_count' => $transcription['word_count'],
                'segments_count' => $transcription['segments_count'] ?? 0,
                'duration_seconds' => $transcription['duration_seconds'],
                'confidence_score' => $transcription['confidence_score'],
                'language' => $transcription['language'],
                'speakers_count' => count($transcription['analytics']['speakers'] ?? []),
                'created_at' => $transcription['created_at'],
                'completed_at' => $transcription['completed_at']
            ];
            
            if (isset($transcription['analytics'])) {
                $stats = array_merge($stats, $transcription['analytics']);
            }
            
            return Response::success($stats);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get transcription stats: ' . $e->getMessage());
        }
    }

    /**
     * Format transcription for export
     */
    private function formatTranscriptionExport(array $transcription, string $format, bool $includeTimestamps, bool $includeSpeakers): string
    {
        $segments = $transcription['segments'] ?? [];
        $output = '';
        
        switch ($format) {
            case 'txt':
                foreach ($segments as $segment) {
                    $line = '';
                    
                    if ($includeTimestamps) {
                        $startTime = gmdate('H:i:s', $segment['start_time']);
                        $line .= "[{$startTime}] ";
                    }
                    
                    if ($includeSpeakers && !empty($segment['speaker_name'])) {
                        $line .= "{$segment['speaker_name']}: ";
                    }
                    
                    $line .= $segment['text'] . "\n";
                    $output .= $line;
                }
                break;
                
            case 'srt':
                $counter = 1;
                foreach ($segments as $segment) {
                    $startTime = $this->formatSrtTime($segment['start_time']);
                    $endTime = $this->formatSrtTime($segment['end_time']);
                    
                    $output .= "{$counter}\n";
                    $output .= "{$startTime} --> {$endTime}\n";
                    
                    if ($includeSpeakers && !empty($segment['speaker_name'])) {
                        $output .= "{$segment['speaker_name']}: ";
                    }
                    
                    $output .= $segment['text'] . "\n\n";
                    $counter++;
                }
                break;
                
            case 'vtt':
                $output = "WEBVTT\n\n";
                foreach ($segments as $segment) {
                    $startTime = $this->formatVttTime($segment['start_time']);
                    $endTime = $this->formatVttTime($segment['end_time']);
                    
                    $output .= "{$startTime} --> {$endTime}\n";
                    
                    if ($includeSpeakers && !empty($segment['speaker_name'])) {
                        $output .= "<v {$segment['speaker_name']}>";
                    }
                    
                    $output .= $segment['text'] . "\n\n";
                }
                break;
                
            case 'json':
                $exportData = [
                    'interview_id' => $transcription['interview_id'],
                    'transcription_id' => $transcription['transcription_id'],
                    'metadata' => [
                        'word_count' => $transcription['word_count'],
                        'duration_seconds' => $transcription['duration_seconds'],
                        'confidence_score' => $transcription['confidence_score'],
                        'language' => $transcription['language'],
                        'created_at' => $transcription['created_at'],
                        'completed_at' => $transcription['completed_at']
                    ],
                    'segments' => $segments
                ];
                $output = json_encode($exportData, JSON_PRETTY_PRINT);
                break;
        }
        
        return $output;
    }

    /**
     * Format time for SRT format
     */
    private function formatSrtTime(float $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        $milliseconds = ($secs - floor($secs)) * 1000;
        
        return sprintf('%02d:%02d:%02d,%03d', $hours, $minutes, floor($secs), $milliseconds);
    }

    /**
     * Format time for VTT format
     */
    private function formatVttTime(float $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        $milliseconds = ($secs - floor($secs)) * 1000;
        
        return sprintf('%02d:%02d:%02d.%03d', $hours, $minutes, floor($secs), $milliseconds);
    }

    /**
     * Get transcription settings (helper method)
     */
    private function getTranscriptionSettings(string $interviewId): array
    {
        // This would be implemented to get settings from the service
        return [
            'auto_transcription' => true,
            'language_preference' => 'en',
            'transcription_engine' => 'web_speech_api',
            'real_time_display' => true,
            'speaker_identification' => true,
            'profanity_filter' => false,
            'punctuation_auto' => true,
            'confidence_threshold' => 0.70
        ];
    }
}
