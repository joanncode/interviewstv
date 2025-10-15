<?php

namespace App\Services;

/**
 * Transcription Service
 * Handles real-time and post-processing transcription for interviews
 */
class TranscriptionService
{
    private $pdo;
    private $settings;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->loadSystemSettings();
    }

    /**
     * Start real-time transcription for an interview
     */
    public function startRealtimeTranscription(string $interviewId, array $options = []): array
    {
        try {
            // Create transcription record
            $transcriptionId = $this->createTranscriptionRecord($interviewId, $options);
            
            // Initialize real-time buffer
            $this->initializeRealtimeBuffer($interviewId);
            
            // Get transcription settings
            $settings = $this->getTranscriptionSettings($interviewId);
            
            return [
                'transcription_id' => $transcriptionId,
                'settings' => $settings,
                'websocket_endpoint' => $this->getWebSocketEndpoint($interviewId),
                'supported_languages' => $this->getSupportedLanguages(),
                'confidence_threshold' => $settings['confidence_threshold'] ?? 0.70
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to start transcription: ' . $e->getMessage());
        }
    }

    /**
     * Process real-time transcription segment
     */
    public function processRealtimeSegment(string $interviewId, array $segmentData): array
    {
        try {
            $speakerId = $segmentData['speaker_id'] ?? null;
            $text = $segmentData['text'] ?? '';
            $confidence = $segmentData['confidence'] ?? 0.0;
            $isFinal = $segmentData['is_final'] ?? false;
            $timestampOffset = $segmentData['timestamp_offset'] ?? 0.0;
            $sessionId = $segmentData['session_id'] ?? uniqid();
            
            // Store in real-time buffer
            $bufferId = $this->storeRealtimeSegment($interviewId, $speakerId, $sessionId, $text, $confidence, $isFinal, $timestampOffset);
            
            // If final, process and store permanent segment
            if ($isFinal && $confidence >= $this->settings['confidence_threshold']) {
                $segmentId = $this->createPermanentSegment($interviewId, $speakerId, $text, $confidence, $timestampOffset);
                
                // Clean up buffer for this segment
                $this->cleanupBufferSegment($bufferId);
                
                // Update analytics
                $this->updateTranscriptionAnalytics($interviewId, $text, $speakerId);
                
                return [
                    'segment_id' => $segmentId,
                    'buffer_id' => $bufferId,
                    'processed' => true,
                    'confidence' => $confidence,
                    'speaker_identified' => !empty($speakerId)
                ];
            }
            
            return [
                'buffer_id' => $bufferId,
                'processed' => false,
                'confidence' => $confidence,
                'is_interim' => !$isFinal
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to process transcription segment: ' . $e->getMessage());
        }
    }

    /**
     * Get real-time transcription for an interview
     */
    public function getRealtimeTranscription(string $interviewId, array $options = []): array
    {
        try {
            $includeInterim = $options['include_interim'] ?? false;
            $sinceTimestamp = $options['since_timestamp'] ?? 0;
            $speakerId = $options['speaker_id'] ?? null;
            
            // Get permanent segments
            $segments = $this->getTranscriptionSegments($interviewId, [
                'since_timestamp' => $sinceTimestamp,
                'speaker_id' => $speakerId,
                'is_final' => true
            ]);
            
            // Get interim results if requested
            if ($includeInterim) {
                $interimSegments = $this->getBufferSegments($interviewId, [
                    'since_timestamp' => $sinceTimestamp,
                    'speaker_id' => $speakerId,
                    'is_final' => false
                ]);
                
                $segments = array_merge($segments, $interimSegments);
            }
            
            // Sort by timestamp
            usort($segments, function($a, $b) {
                return $a['start_time'] <=> $b['start_time'];
            });
            
            return [
                'interview_id' => $interviewId,
                'segments' => $segments,
                'total_segments' => count($segments),
                'last_update' => date('Y-m-d H:i:s'),
                'speakers' => $this->getIdentifiedSpeakers($interviewId)
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to get real-time transcription: ' . $e->getMessage());
        }
    }

    /**
     * Complete transcription processing
     */
    public function completeTranscription(string $interviewId): array
    {
        try {
            // Get transcription record
            $transcription = $this->getTranscriptionRecord($interviewId);
            
            if (!$transcription) {
                throw new Exception('Transcription record not found');
            }
            
            // Process any remaining buffer segments
            $this->processRemainingBufferSegments($interviewId);
            
            // Generate full transcript
            $fullTranscript = $this->generateFullTranscript($interviewId);
            
            // Calculate final analytics
            $analytics = $this->calculateFinalAnalytics($interviewId);
            
            // Update transcription record
            $this->updateTranscriptionRecord($transcription['id'], [
                'status' => 'completed',
                'full_transcript' => $fullTranscript,
                'word_count' => $analytics['total_words'],
                'confidence_score' => $analytics['average_confidence'],
                'completed_at' => date('Y-m-d H:i:s')
            ]);
            
            // Clean up real-time buffer
            $this->cleanupRealtimeBuffer($interviewId);
            
            return [
                'transcription_id' => $transcription['id'],
                'status' => 'completed',
                'full_transcript' => $fullTranscript,
                'analytics' => $analytics,
                'segments_count' => $analytics['total_segments'],
                'speakers' => $this->getIdentifiedSpeakers($interviewId)
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to complete transcription: ' . $e->getMessage());
        }
    }

    /**
     * Get transcription by interview ID
     */
    public function getTranscription(string $interviewId, array $options = []): array
    {
        try {
            $transcription = $this->getTranscriptionRecord($interviewId);
            
            if (!$transcription) {
                return [
                    'exists' => false,
                    'message' => 'No transcription found for this interview'
                ];
            }
            
            $includeSegments = $options['include_segments'] ?? true;
            $includeAnalytics = $options['include_analytics'] ?? true;
            $format = $options['format'] ?? 'structured'; // structured, plain, srt, vtt
            
            $result = [
                'exists' => true,
                'transcription_id' => $transcription['id'],
                'interview_id' => $interviewId,
                'status' => $transcription['status'],
                'language' => $transcription['language'],
                'confidence_score' => $transcription['confidence_score'],
                'word_count' => $transcription['word_count'],
                'duration_seconds' => $transcription['duration_seconds'],
                'created_at' => $transcription['created_at'],
                'completed_at' => $transcription['completed_at']
            ];
            
            if ($includeSegments) {
                $segments = $this->getTranscriptionSegments($interviewId);
                $result['segments'] = $segments;
                $result['segments_count'] = count($segments);
            }
            
            if ($includeAnalytics) {
                $result['analytics'] = $this->getTranscriptionAnalytics($interviewId);
            }
            
            // Format transcript based on requested format
            if ($format !== 'structured') {
                $result['formatted_transcript'] = $this->formatTranscript($interviewId, $format);
            } else {
                $result['full_transcript'] = $transcription['full_transcript'];
            }
            
            return $result;
            
        } catch (Exception $e) {
            throw new Exception('Failed to get transcription: ' . $e->getMessage());
        }
    }

    /**
     * Update transcription settings
     */
    public function updateTranscriptionSettings(string $interviewId, array $settings): array
    {
        try {
            $allowedSettings = [
                'auto_transcription', 'language_preference', 'transcription_engine',
                'real_time_display', 'speaker_identification', 'profanity_filter',
                'punctuation_auto', 'confidence_threshold'
            ];
            
            $validSettings = array_intersect_key($settings, array_flip($allowedSettings));
            
            if (empty($validSettings)) {
                throw new Exception('No valid settings provided');
            }
            
            // Check if settings exist for this interview
            $existingSettings = $this->getTranscriptionSettings($interviewId);
            
            if ($existingSettings) {
                // Update existing settings
                $this->updateExistingSettings($interviewId, $validSettings);
            } else {
                // Create new settings
                $this->createInterviewSettings($interviewId, $validSettings);
            }
            
            return [
                'updated' => true,
                'settings' => $this->getTranscriptionSettings($interviewId),
                'message' => 'Transcription settings updated successfully'
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to update transcription settings: ' . $e->getMessage());
        }
    }

    /**
     * Search transcription content
     */
    public function searchTranscription(string $interviewId, string $query, array $options = []): array
    {
        try {
            $caseSensitive = $options['case_sensitive'] ?? false;
            $wholeWords = $options['whole_words'] ?? false;
            $speakerId = $options['speaker_id'] ?? null;
            $timeRange = $options['time_range'] ?? null; // [start, end] in seconds
            
            $searchQuery = $caseSensitive ? $query : strtolower($query);
            
            $sql = "SELECT ts.*, t.interview_id 
                    FROM transcription_segments ts 
                    JOIN interview_transcriptions t ON ts.transcription_id = t.id 
                    WHERE t.interview_id = ? AND ts.is_final = 1";
            
            $params = [$interviewId];
            
            if ($caseSensitive) {
                $sql .= " AND ts.text LIKE ?";
                $params[] = "%{$searchQuery}%";
            } else {
                $sql .= " AND LOWER(ts.text) LIKE ?";
                $params[] = "%{$searchQuery}%";
            }
            
            if ($speakerId) {
                $sql .= " AND ts.speaker_id = ?";
                $params[] = $speakerId;
            }
            
            if ($timeRange && is_array($timeRange) && count($timeRange) === 2) {
                $sql .= " AND ts.start_time >= ? AND ts.end_time <= ?";
                $params[] = $timeRange[0];
                $params[] = $timeRange[1];
            }
            
            $sql .= " ORDER BY ts.start_time ASC";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Highlight search terms in results
            foreach ($results as &$result) {
                $result['highlighted_text'] = $this->highlightSearchTerms($result['text'], $query, $caseSensitive);
            }
            
            return [
                'query' => $query,
                'results_count' => count($results),
                'results' => $results,
                'search_options' => $options
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to search transcription: ' . $e->getMessage());
        }
    }

    /**
     * Load system transcription settings
     */
    private function loadSystemSettings(): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM transcription_settings WHERE setting_type = 'system' LIMIT 1");
        $stmt->execute();
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->settings = $settings ?: [
            'auto_transcription' => true,
            'language_preference' => 'en',
            'transcription_engine' => 'web_speech_api',
            'confidence_threshold' => 0.70
        ];
    }

    /**
     * Create transcription record
     */
    private function createTranscriptionRecord(string $interviewId, array $options): int
    {
        $language = $options['language'] ?? $this->settings['language_preference'];
        $engine = $options['engine'] ?? $this->settings['transcription_engine'];

        $stmt = $this->pdo->prepare("
            INSERT INTO interview_transcriptions
            (interview_id, language, transcription_engine, created_at)
            VALUES (?, ?, ?, ?)
        ");

        $stmt->execute([$interviewId, $language, $engine, date('Y-m-d H:i:s')]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Initialize real-time buffer
     */
    private function initializeRealtimeBuffer(string $interviewId): void
    {
        // Clean any existing buffer for this interview
        $stmt = $this->pdo->prepare("DELETE FROM realtime_transcription_buffer WHERE interview_id = ?");
        $stmt->execute([$interviewId]);
    }

    /**
     * Get transcription settings for interview
     */
    private function getTranscriptionSettings(string $interviewId): array
    {
        // Try interview-specific settings first
        $stmt = $this->pdo->prepare("
            SELECT * FROM transcription_settings
            WHERE interview_id = ? AND setting_type = 'interview'
            LIMIT 1
        ");
        $stmt->execute([$interviewId]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$settings) {
            // Fall back to system settings
            $settings = $this->settings;
        }

        return $settings;
    }

    /**
     * Get WebSocket endpoint for real-time transcription
     */
    private function getWebSocketEndpoint(string $interviewId): string
    {
        // Return WebSocket endpoint for real-time transcription
        return "ws://localhost:8080/transcription/{$interviewId}";
    }

    /**
     * Get supported languages
     */
    private function getSupportedLanguages(): array
    {
        return [
            'en' => 'English',
            'es' => 'Spanish',
            'fr' => 'French',
            'de' => 'German',
            'it' => 'Italian',
            'pt' => 'Portuguese',
            'ru' => 'Russian',
            'ja' => 'Japanese',
            'ko' => 'Korean',
            'zh' => 'Chinese'
        ];
    }

    /**
     * Store real-time segment in buffer
     */
    private function storeRealtimeSegment(string $interviewId, ?string $speakerId, string $sessionId, string $text, float $confidence, bool $isFinal, float $timestampOffset): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO realtime_transcription_buffer
            (interview_id, speaker_id, session_id, sequence_number, text, confidence, is_final, timestamp_offset, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        // Get next sequence number
        $seqStmt = $this->pdo->prepare("SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM realtime_transcription_buffer WHERE interview_id = ? AND session_id = ?");
        $seqStmt->execute([$interviewId, $sessionId]);
        $sequenceNumber = $seqStmt->fetchColumn();

        $expiresAt = date('Y-m-d H:i:s', strtotime('+2 hours')); // Buffer expires in 2 hours

        $stmt->execute([
            $interviewId, $speakerId, $sessionId, $sequenceNumber, $text,
            $confidence, $isFinal ? 1 : 0, $timestampOffset,
            date('Y-m-d H:i:s'), $expiresAt
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Create permanent transcription segment
     */
    private function createPermanentSegment(string $interviewId, ?string $speakerId, string $text, float $confidence, float $timestampOffset): int
    {
        // Get transcription ID
        $stmt = $this->pdo->prepare("SELECT id FROM interview_transcriptions WHERE interview_id = ? LIMIT 1");
        $stmt->execute([$interviewId]);
        $transcriptionId = $stmt->fetchColumn();

        if (!$transcriptionId) {
            throw new Exception('Transcription record not found');
        }

        // Estimate end time (assuming average speaking pace)
        $wordCount = str_word_count($text);
        $estimatedDuration = $wordCount * 0.4; // ~150 words per minute
        $endTime = $timestampOffset + $estimatedDuration;

        // Get speaker info
        $speakerName = $this->getSpeakerName($speakerId);
        $speakerType = $this->getSpeakerType($speakerId);

        $stmt = $this->pdo->prepare("
            INSERT INTO transcription_segments
            (transcription_id, speaker_id, speaker_name, speaker_type, start_time, end_time, text, confidence, is_final, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ");

        $stmt->execute([
            $transcriptionId, $speakerId, $speakerName, $speakerType,
            $timestampOffset, $endTime, $text, $confidence, date('Y-m-d H:i:s')
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Update transcription analytics
     */
    private function updateTranscriptionAnalytics(string $interviewId, string $text, ?string $speakerId): void
    {
        $wordCount = str_word_count($text);

        // Check if analytics record exists
        $stmt = $this->pdo->prepare("SELECT id FROM transcription_analytics WHERE interview_id = ? LIMIT 1");
        $stmt->execute([$interviewId]);
        $analyticsId = $stmt->fetchColumn();

        if ($analyticsId) {
            // Update existing analytics
            $stmt = $this->pdo->prepare("
                UPDATE transcription_analytics
                SET total_words = total_words + ?, updated_at = ?
                WHERE id = ?
            ");
            $stmt->execute([$wordCount, date('Y-m-d H:i:s'), $analyticsId]);
        } else {
            // Create new analytics record
            $stmt = $this->pdo->prepare("
                INSERT INTO transcription_analytics
                (interview_id, total_words, created_at)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$interviewId, $wordCount, date('Y-m-d H:i:s')]);
        }
    }

    /**
     * Get speaker name by ID
     */
    private function getSpeakerName(?string $speakerId): ?string
    {
        if (!$speakerId) return null;

        // Try to get from users table
        $stmt = $this->pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$speakerId]);
        $name = $stmt->fetchColumn();

        return $name ?: "Speaker {$speakerId}";
    }

    /**
     * Get speaker type by ID
     */
    private function getSpeakerType(?string $speakerId): string
    {
        if (!$speakerId) return 'participant';

        // Logic to determine if speaker is host or guest
        // This would depend on your user/interview structure
        return 'participant';
    }

    /**
     * Get transcription record
     */
    private function getTranscriptionRecord(string $interviewId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM interview_transcriptions WHERE interview_id = ? LIMIT 1");
        $stmt->execute([$interviewId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get transcription segments
     */
    private function getTranscriptionSegments(string $interviewId, array $filters = []): array
    {
        $sql = "SELECT ts.* FROM transcription_segments ts
                JOIN interview_transcriptions t ON ts.transcription_id = t.id
                WHERE t.interview_id = ?";
        $params = [$interviewId];

        if (isset($filters['speaker_id'])) {
            $sql .= " AND ts.speaker_id = ?";
            $params[] = $filters['speaker_id'];
        }

        if (isset($filters['is_final'])) {
            $sql .= " AND ts.is_final = ?";
            $params[] = $filters['is_final'] ? 1 : 0;
        }

        if (isset($filters['since_timestamp'])) {
            $sql .= " AND ts.start_time >= ?";
            $params[] = $filters['since_timestamp'];
        }

        $sql .= " ORDER BY ts.start_time ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Highlight search terms in text
     */
    private function highlightSearchTerms(string $text, string $query, bool $caseSensitive): string
    {
        $flags = $caseSensitive ? '' : 'i';
        $pattern = '/(' . preg_quote($query, '/') . ')/' . $flags;
        return preg_replace($pattern, '<mark>$1</mark>', $text);
    }

    // Additional helper methods would be implemented here...
    private function cleanupBufferSegment(int $bufferId): void {}
    private function getIdentifiedSpeakers(string $interviewId): array { return []; }
    private function processRemainingBufferSegments(string $interviewId): void {}
    private function generateFullTranscript(string $interviewId): string { return ''; }
    private function calculateFinalAnalytics(string $interviewId): array { return []; }
    private function updateTranscriptionRecord(int $id, array $data): void {}
    private function cleanupRealtimeBuffer(string $interviewId): void {}
    private function getTranscriptionAnalytics(string $interviewId): array { return []; }
    private function formatTranscript(string $interviewId, string $format): string { return ''; }
    private function updateExistingSettings(string $interviewId, array $settings): void {}
    private function createInterviewSettings(string $interviewId, array $settings): void {}
    private function getBufferSegments(string $interviewId, array $filters): array { return []; }
}
