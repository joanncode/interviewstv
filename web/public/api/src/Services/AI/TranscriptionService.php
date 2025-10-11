<?php

namespace App\Services\AI;

class TranscriptionService
{
    private $openaiApiKey;
    private $whisperModel = 'whisper-1';
    private $maxFileSize = 25 * 1024 * 1024; // 25MB limit for OpenAI
    
    public function __construct()
    {
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? '';
    }
    
    /**
     * Transcribe audio file using OpenAI Whisper
     */
    public function transcribe($audioPath, $options = [])
    {
        if (!file_exists($audioPath)) {
            throw new \Exception('Audio file not found: ' . $audioPath);
        }
        
        if (filesize($audioPath) > $this->maxFileSize) {
            return $this->transcribeLargeFile($audioPath, $options);
        }
        
        return $this->transcribeFile($audioPath, $options);
    }
    
    /**
     * Transcribe single audio file
     */
    private function transcribeFile($audioPath, $options = [])
    {
        $curl = curl_init();
        
        $postFields = [
            'file' => new \CURLFile($audioPath),
            'model' => $this->whisperModel,
            'response_format' => 'verbose_json',
            'timestamp_granularities[]' => 'word'
        ];
        
        // Add optional parameters
        if (isset($options['language'])) {
            $postFields['language'] = $options['language'];
        }
        
        if (isset($options['prompt'])) {
            $postFields['prompt'] = $options['prompt'];
        }
        
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.openai.com/v1/audio/transcriptions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->openaiApiKey,
            ],
            CURLOPT_TIMEOUT => 300, // 5 minutes timeout
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        if ($error) {
            throw new \Exception('cURL error: ' . $error);
        }
        
        if ($httpCode !== 200) {
            throw new \Exception('OpenAI API error: HTTP ' . $httpCode . ' - ' . $response);
        }
        
        $result = json_decode($response, true);
        
        if (!$result) {
            throw new \Exception('Invalid response from OpenAI API');
        }
        
        return $this->processTranscriptionResult($result);
    }
    
    /**
     * Handle large files by splitting them
     */
    private function transcribeLargeFile($audioPath, $options = [])
    {
        $chunks = $this->splitAudioFile($audioPath);
        $transcriptions = [];
        $totalDuration = 0;
        
        foreach ($chunks as $index => $chunkPath) {
            try {
                $chunkResult = $this->transcribeFile($chunkPath, $options);
                $transcriptions[] = $chunkResult;
                $totalDuration += $chunkResult['duration'];
                
                // Clean up chunk file
                unlink($chunkPath);
                
            } catch (\Exception $e) {
                // Clean up remaining chunks
                foreach ($chunks as $cleanupChunk) {
                    if (file_exists($cleanupChunk)) {
                        unlink($cleanupChunk);
                    }
                }
                throw $e;
            }
        }
        
        return $this->mergeTranscriptions($transcriptions, $totalDuration);
    }
    
    /**
     * Split large audio file into smaller chunks
     */
    private function splitAudioFile($audioPath)
    {
        $chunkDuration = 600; // 10 minutes per chunk
        $chunks = [];
        $chunkIndex = 0;
        
        // Get audio duration
        $duration = $this->getAudioDuration($audioPath);
        
        for ($start = 0; $start < $duration; $start += $chunkDuration) {
            $chunkPath = sys_get_temp_dir() . '/' . uniqid() . '_chunk_' . $chunkIndex . '.wav';
            
            $command = sprintf(
                'ffmpeg -i %s -ss %d -t %d -c copy %s 2>/dev/null',
                escapeshellarg($audioPath),
                $start,
                $chunkDuration,
                escapeshellarg($chunkPath)
            );
            
            exec($command, $output, $returnCode);
            
            if ($returnCode === 0 && file_exists($chunkPath)) {
                $chunks[] = $chunkPath;
                $chunkIndex++;
            }
        }
        
        return $chunks;
    }
    
    /**
     * Get audio file duration
     */
    private function getAudioDuration($audioPath)
    {
        $command = sprintf(
            'ffprobe -v quiet -show_entries format=duration -of csv="p=0" %s',
            escapeshellarg($audioPath)
        );
        
        $duration = exec($command);
        return (float) $duration;
    }
    
    /**
     * Merge multiple transcription results
     */
    private function mergeTranscriptions($transcriptions, $totalDuration)
    {
        $mergedText = '';
        $mergedWords = [];
        $mergedSegments = [];
        $timeOffset = 0;
        
        foreach ($transcriptions as $transcription) {
            $mergedText .= $transcription['text'] . ' ';
            
            // Adjust timestamps and merge words
            if (isset($transcription['words'])) {
                foreach ($transcription['words'] as $word) {
                    $word['start'] += $timeOffset;
                    $word['end'] += $timeOffset;
                    $mergedWords[] = $word;
                }
            }
            
            // Adjust timestamps and merge segments
            if (isset($transcription['segments'])) {
                foreach ($transcription['segments'] as $segment) {
                    $segment['start'] += $timeOffset;
                    $segment['end'] += $timeOffset;
                    $mergedSegments[] = $segment;
                }
            }
            
            $timeOffset += $transcription['duration'];
        }
        
        return [
            'text' => trim($mergedText),
            'words' => $mergedWords,
            'segments' => $mergedSegments,
            'duration' => $totalDuration,
            'language' => $transcriptions[0]['language'] ?? 'en'
        ];
    }
    
    /**
     * Process and enhance transcription result
     */
    private function processTranscriptionResult($result)
    {
        $processed = [
            'text' => $result['text'],
            'language' => $result['language'] ?? 'en',
            'duration' => $result['duration'] ?? 0,
            'words' => $result['words'] ?? [],
            'segments' => $result['segments'] ?? []
        ];
        
        // Add speaker identification (basic implementation)
        $processed['speakers'] = $this->identifySpeakers($processed);
        
        // Add sentence boundaries
        $processed['sentences'] = $this->extractSentences($processed);
        
        // Add paragraph breaks
        $processed['paragraphs'] = $this->createParagraphs($processed);
        
        // Calculate speaking statistics
        $processed['statistics'] = $this->calculateSpeakingStatistics($processed);
        
        return $processed;
    }
    
    /**
     * Basic speaker identification
     */
    private function identifySpeakers($transcription)
    {
        $speakers = [];
        $currentSpeaker = 'Speaker 1';
        $speakerChangeThreshold = 2.0; // seconds
        
        if (empty($transcription['segments'])) {
            return [['speaker' => $currentSpeaker, 'start' => 0, 'end' => $transcription['duration']]];
        }
        
        $lastEnd = 0;
        
        foreach ($transcription['segments'] as $segment) {
            // Simple heuristic: if there's a long pause, assume speaker change
            if ($segment['start'] - $lastEnd > $speakerChangeThreshold) {
                $currentSpeaker = $currentSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
            }
            
            $speakers[] = [
                'speaker' => $currentSpeaker,
                'start' => $segment['start'],
                'end' => $segment['end'],
                'text' => $segment['text']
            ];
            
            $lastEnd = $segment['end'];
        }
        
        return $speakers;
    }
    
    /**
     * Extract sentences with timestamps
     */
    private function extractSentences($transcription)
    {
        $sentences = [];
        $text = $transcription['text'];
        
        // Split by sentence endings
        $sentenceEndings = preg_split('/[.!?]+/', $text, -1, PREG_SPLIT_OFFSET_CAPTURE);
        
        foreach ($sentenceEndings as $index => $sentence) {
            if (trim($sentence[0]) === '') continue;
            
            $sentences[] = [
                'text' => trim($sentence[0]),
                'start_offset' => $sentence[1],
                'end_offset' => $sentence[1] + strlen($sentence[0])
            ];
        }
        
        return $sentences;
    }
    
    /**
     * Create paragraph breaks based on pauses
     */
    private function createParagraphs($transcription)
    {
        $paragraphs = [];
        $currentParagraph = '';
        $paragraphStartTime = 0;
        $pauseThreshold = 3.0; // seconds
        
        if (empty($transcription['segments'])) {
            return [['text' => $transcription['text'], 'start' => 0, 'end' => $transcription['duration']]];
        }
        
        $lastEnd = 0;
        
        foreach ($transcription['segments'] as $segment) {
            // If there's a long pause, start a new paragraph
            if ($segment['start'] - $lastEnd > $pauseThreshold && !empty($currentParagraph)) {
                $paragraphs[] = [
                    'text' => trim($currentParagraph),
                    'start' => $paragraphStartTime,
                    'end' => $lastEnd
                ];
                
                $currentParagraph = '';
                $paragraphStartTime = $segment['start'];
            }
            
            if (empty($currentParagraph)) {
                $paragraphStartTime = $segment['start'];
            }
            
            $currentParagraph .= $segment['text'] . ' ';
            $lastEnd = $segment['end'];
        }
        
        // Add the last paragraph
        if (!empty($currentParagraph)) {
            $paragraphs[] = [
                'text' => trim($currentParagraph),
                'start' => $paragraphStartTime,
                'end' => $lastEnd
            ];
        }
        
        return $paragraphs;
    }
    
    /**
     * Calculate speaking statistics
     */
    private function calculateSpeakingStatistics($transcription)
    {
        $stats = [
            'total_words' => 0,
            'speaking_time' => 0,
            'words_per_minute' => 0,
            'average_pause_duration' => 0,
            'longest_pause' => 0,
            'pause_count' => 0
        ];
        
        if (!empty($transcription['words'])) {
            $stats['total_words'] = count($transcription['words']);
            
            // Calculate speaking time (excluding pauses)
            $speakingTime = 0;
            $pauses = [];
            $lastEnd = 0;
            
            foreach ($transcription['words'] as $word) {
                $speakingTime += $word['end'] - $word['start'];
                
                if ($lastEnd > 0) {
                    $pauseDuration = $word['start'] - $lastEnd;
                    if ($pauseDuration > 0.1) { // Minimum 100ms pause
                        $pauses[] = $pauseDuration;
                    }
                }
                
                $lastEnd = $word['end'];
            }
            
            $stats['speaking_time'] = $speakingTime;
            $stats['words_per_minute'] = $speakingTime > 0 ? ($stats['total_words'] / $speakingTime) * 60 : 0;
            
            if (!empty($pauses)) {
                $stats['pause_count'] = count($pauses);
                $stats['average_pause_duration'] = array_sum($pauses) / count($pauses);
                $stats['longest_pause'] = max($pauses);
            }
        }
        
        return $stats;
    }
    
    /**
     * Get transcription with speaker diarization
     */
    public function transcribeWithSpeakers($audioPath, $options = [])
    {
        // First get basic transcription
        $transcription = $this->transcribe($audioPath, $options);
        
        // Enhance with better speaker identification if available
        if (isset($_ENV['PYANNOTE_API_KEY'])) {
            $transcription['speakers'] = $this->enhancedSpeakerDiarization($audioPath);
        }
        
        return $transcription;
    }
    
    /**
     * Enhanced speaker diarization using pyannote.audio
     */
    private function enhancedSpeakerDiarization($audioPath)
    {
        // This would integrate with pyannote.audio or similar service
        // For now, return basic speaker identification
        return $this->identifySpeakers(['segments' => [], 'duration' => $this->getAudioDuration($audioPath)]);
    }
}
