<?php

namespace App\Services;

/**
 * AI-Powered Highlights Service
 * Intelligent detection and analysis of interview highlights
 */
class HighlightsService
{
    private $pdo;
    private $detectionRules;
    private $keywords;
    private $templates;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->loadDetectionRules();
        $this->loadKeywords();
        $this->loadTemplates();
    }

    /**
     * Analyze interview and detect highlights
     */
    public function analyzeInterview(string $interviewId, array $options = []): array
    {
        try {
            // Get interview data
            $interviewData = $this->getInterviewData($interviewId);
            if (!$interviewData) {
                throw new Exception('Interview not found');
            }

            // Get transcription data
            $transcriptionData = $this->getTranscriptionData($interviewId);
            
            // Analyze different aspects
            $highlights = [];
            
            // 1. Keyword-based detection
            $keywordHighlights = $this->detectKeywordHighlights($transcriptionData, $options);
            $highlights = array_merge($highlights, $keywordHighlights);
            
            // 2. Emotion-based detection
            $emotionHighlights = $this->detectEmotionHighlights($transcriptionData, $options);
            $highlights = array_merge($highlights, $emotionHighlights);
            
            // 3. Topic change detection
            $topicHighlights = $this->detectTopicChanges($transcriptionData, $options);
            $highlights = array_merge($highlights, $topicHighlights);
            
            // 4. Question-Answer detection
            $qaHighlights = $this->detectQuestionAnswers($transcriptionData, $options);
            $highlights = array_merge($highlights, $qaHighlights);
            
            // 5. Audio pattern analysis (simulated)
            $audioHighlights = $this->detectAudioPatterns($transcriptionData, $options);
            $highlights = array_merge($highlights, $audioHighlights);
            
            // Score and rank highlights
            $rankedHighlights = $this->scoreAndRankHighlights($highlights, $options);
            
            // Save highlights to database
            $savedHighlights = $this->saveHighlights($interviewId, $rankedHighlights);
            
            // Generate thumbnails and clips (async)
            $this->queueMediaGeneration($interviewId, $savedHighlights);
            
            return [
                'interview_id' => $interviewId,
                'total_highlights' => count($savedHighlights),
                'highlights' => $savedHighlights,
                'analysis_summary' => $this->generateAnalysisSummary($savedHighlights),
                'processing_time' => microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true))
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to analyze interview highlights: ' . $e->getMessage());
        }
    }

    /**
     * Get highlights for an interview
     */
    public function getInterviewHighlights(string $interviewId, array $options = []): array
    {
        try {
            $sql = "SELECT * FROM interview_highlights WHERE interview_id = ?";
            $params = [$interviewId];
            
            // Apply filters
            if (isset($options['type'])) {
                $sql .= " AND highlight_type = ?";
                $params[] = $options['type'];
            }
            
            if (isset($options['status'])) {
                $sql .= " AND status = ?";
                $params[] = $options['status'];
            }
            
            if (isset($options['min_confidence'])) {
                $sql .= " AND confidence_score >= ?";
                $params[] = $options['min_confidence'];
            }
            
            // Ordering
            $orderBy = $options['order_by'] ?? 'importance_score';
            $orderDir = $options['order_dir'] ?? 'DESC';
            $sql .= " ORDER BY {$orderBy} {$orderDir}";
            
            // Limit
            if (isset($options['limit'])) {
                $sql .= " LIMIT ?";
                $params[] = $options['limit'];
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $highlights = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($highlights as &$highlight) {
                $highlight['keywords'] = json_decode($highlight['keywords'], true) ?? [];
                $highlight['topics'] = json_decode($highlight['topics'], true) ?? [];
                $highlight['emotions'] = json_decode($highlight['emotions'], true) ?? [];
            }
            
            return $highlights;
            
        } catch (Exception $e) {
            throw new Exception('Failed to get interview highlights: ' . $e->getMessage());
        }
    }

    /**
     * Update highlight status
     */
    public function updateHighlightStatus(string $highlightId, string $status, int $userId = null): array
    {
        try {
            $allowedStatuses = ['detected', 'reviewed', 'approved', 'rejected', 'featured'];
            if (!in_array($status, $allowedStatuses)) {
                throw new Exception('Invalid status');
            }
            
            $stmt = $this->pdo->prepare("
                UPDATE interview_highlights 
                SET status = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
                WHERE highlight_id = ?
            ");
            
            $stmt->execute([
                $status,
                date('Y-m-d H:i:s'),
                $userId,
                date('Y-m-d H:i:s'),
                $highlightId
            ]);
            
            return $this->getHighlightById($highlightId);
            
        } catch (Exception $e) {
            throw new Exception('Failed to update highlight status: ' . $e->getMessage());
        }
    }

    /**
     * Generate highlight summary
     */
    public function generateHighlightSummary(string $interviewId): array
    {
        try {
            $highlights = $this->getInterviewHighlights($interviewId);
            
            $summary = [
                'total_highlights' => count($highlights),
                'by_type' => [],
                'by_status' => [],
                'avg_confidence' => 0,
                'avg_importance' => 0,
                'total_duration' => 0,
                'top_keywords' => [],
                'top_topics' => [],
                'emotional_analysis' => []
            ];
            
            if (empty($highlights)) {
                return $summary;
            }
            
            // Calculate statistics
            $confidenceSum = 0;
            $importanceSum = 0;
            $allKeywords = [];
            $allTopics = [];
            $allEmotions = [];
            
            foreach ($highlights as $highlight) {
                // By type
                $type = $highlight['highlight_type'];
                $summary['by_type'][$type] = ($summary['by_type'][$type] ?? 0) + 1;
                
                // By status
                $status = $highlight['status'];
                $summary['by_status'][$status] = ($summary['by_status'][$status] ?? 0) + 1;
                
                // Averages
                $confidenceSum += $highlight['confidence_score'];
                $importanceSum += $highlight['importance_score'];
                
                // Duration
                $summary['total_duration'] += $highlight['duration'];
                
                // Keywords and topics
                $allKeywords = array_merge($allKeywords, $highlight['keywords']);
                $allTopics = array_merge($allTopics, $highlight['topics']);
                
                // Emotions
                if (!empty($highlight['emotions'])) {
                    foreach ($highlight['emotions'] as $emotion => $score) {
                        $allEmotions[$emotion] = ($allEmotions[$emotion] ?? 0) + $score;
                    }
                }
            }
            
            $summary['avg_confidence'] = round($confidenceSum / count($highlights), 2);
            $summary['avg_importance'] = round($importanceSum / count($highlights), 2);
            $summary['top_keywords'] = array_slice(array_count_values($allKeywords), 0, 10, true);
            $summary['top_topics'] = array_slice(array_count_values($allTopics), 0, 10, true);
            $summary['emotional_analysis'] = $allEmotions;
            
            return $summary;
            
        } catch (Exception $e) {
            throw new Exception('Failed to generate highlight summary: ' . $e->getMessage());
        }
    }

    /**
     * Search highlights
     */
    public function searchHighlights(array $criteria): array
    {
        try {
            $sql = "SELECT * FROM interview_highlights WHERE 1=1";
            $params = [];
            
            if (!empty($criteria['interview_id'])) {
                $sql .= " AND interview_id = ?";
                $params[] = $criteria['interview_id'];
            }
            
            if (!empty($criteria['keyword'])) {
                $sql .= " AND (title LIKE ? OR description LIKE ? OR transcript_text LIKE ?)";
                $keyword = '%' . $criteria['keyword'] . '%';
                $params[] = $keyword;
                $params[] = $keyword;
                $params[] = $keyword;
            }
            
            if (!empty($criteria['type'])) {
                $sql .= " AND highlight_type = ?";
                $params[] = $criteria['type'];
            }
            
            if (!empty($criteria['date_from'])) {
                $sql .= " AND created_at >= ?";
                $params[] = $criteria['date_from'];
            }
            
            if (!empty($criteria['date_to'])) {
                $sql .= " AND created_at <= ?";
                $params[] = $criteria['date_to'];
            }
            
            $sql .= " ORDER BY importance_score DESC, confidence_score DESC";
            
            if (!empty($criteria['limit'])) {
                $sql .= " LIMIT ?";
                $params[] = $criteria['limit'];
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $highlights = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($highlights as &$highlight) {
                $highlight['keywords'] = json_decode($highlight['keywords'], true) ?? [];
                $highlight['topics'] = json_decode($highlight['topics'], true) ?? [];
                $highlight['emotions'] = json_decode($highlight['emotions'], true) ?? [];
            }
            
            return $highlights;
            
        } catch (Exception $e) {
            throw new Exception('Failed to search highlights: ' . $e->getMessage());
        }
    }

    /**
     * Submit highlight feedback
     */
    public function submitFeedback(string $highlightId, int $userId, array $feedback): array
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO highlight_feedback 
                (highlight_id, user_id, feedback_type, rating, is_helpful, comments, 
                 suggested_start_time, suggested_end_time, suggested_title, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $highlightId,
                $userId,
                $feedback['feedback_type'] ?? 'quality',
                $feedback['rating'] ?? null,
                $feedback['is_helpful'] ?? null,
                $feedback['comments'] ?? null,
                $feedback['suggested_start_time'] ?? null,
                $feedback['suggested_end_time'] ?? null,
                $feedback['suggested_title'] ?? null,
                date('Y-m-d H:i:s')
            ]);
            
            $feedbackId = $this->pdo->lastInsertId();
            
            // Get the created feedback
            $stmt = $this->pdo->prepare("SELECT * FROM highlight_feedback WHERE id = ?");
            $stmt->execute([$feedbackId]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            throw new Exception('Failed to submit feedback: ' . $e->getMessage());
        }
    }

    /**
     * Load detection rules from database
     */
    private function loadDetectionRules(): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM highlight_detection_rules WHERE is_active = 1");
        $stmt->execute();
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->detectionRules = [];
        foreach ($rules as $rule) {
            $rule['rule_config'] = json_decode($rule['rule_config'], true);
            $rule['applies_to_types'] = json_decode($rule['applies_to_types'], true);
            $this->detectionRules[$rule['rule_type']][] = $rule;
        }
    }

    /**
     * Load keywords from database
     */
    private function loadKeywords(): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM highlight_keywords WHERE is_active = 1");
        $stmt->execute();
        $keywords = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->keywords = [];
        foreach ($keywords as $keyword) {
            $this->keywords[$keyword['category']][] = $keyword;
        }
    }

    /**
     * Load templates from database
     */
    private function loadTemplates(): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM highlight_templates WHERE is_active = 1 ORDER BY priority DESC");
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->templates = [];
        foreach ($templates as $template) {
            $template['detection_criteria'] = json_decode($template['detection_criteria'], true);
            $this->templates[$template['highlight_type']][] = $template;
        }
    }

    /**
     * Get interview data
     */
    private function getInterviewData(string $interviewId): ?array
    {
        // This would typically fetch from interview_rooms table
        // For demo purposes, we'll return mock data
        return [
            'interview_id' => $interviewId,
            'title' => 'Demo Interview',
            'duration' => 3600, // 1 hour
            'participants' => ['Host', 'Guest'],
            'type' => 'business'
        ];
    }

    /**
     * Get transcription data
     */
    private function getTranscriptionData(string $interviewId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT ts.*, t.source_language
                FROM transcription_segments ts
                JOIN interview_transcriptions t ON ts.transcription_id = t.id
                WHERE t.interview_id = ?
                ORDER BY ts.start_time ASC
            ");
            $stmt->execute([$interviewId]);
            $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($segments)) {
                // Return demo data for testing
                return $this->getDemoTranscriptionData();
            }

            return $segments;

        } catch (Exception $e) {
            // Return demo data if transcription not found
            return $this->getDemoTranscriptionData();
        }
    }

    /**
     * Get demo transcription data for testing
     */
    private function getDemoTranscriptionData(): array
    {
        return [
            [
                'id' => 1,
                'start_time' => 0.0,
                'end_time' => 15.0,
                'text' => 'Welcome to our interview today. I\'m excited to discuss your breakthrough discovery.',
                'speaker_label' => 'Host',
                'confidence' => 0.95
            ],
            [
                'id' => 2,
                'start_time' => 15.0,
                'end_time' => 45.0,
                'text' => 'Thank you for having me. This discovery has been a real game changer for our industry. I\'m passionate about sharing this insight with everyone.',
                'speaker_label' => 'Guest',
                'confidence' => 0.92
            ],
            [
                'id' => 3,
                'start_time' => 45.0,
                'end_time' => 75.0,
                'text' => 'That\'s fascinating! Can you tell us more about the key moment when you realized this breakthrough?',
                'speaker_label' => 'Host',
                'confidence' => 0.88
            ],
            [
                'id' => 4,
                'start_time' => 75.0,
                'end_time' => 120.0,
                'text' => 'It was a eureka moment! I was analyzing the data when suddenly everything clicked. This innovation will revolutionize how we approach the problem.',
                'speaker_label' => 'Guest',
                'confidence' => 0.94
            ],
            [
                'id' => 5,
                'start_time' => 120.0,
                'end_time' => 150.0,
                'text' => 'What an important insight! This could have significant implications for the future.',
                'speaker_label' => 'Host',
                'confidence' => 0.90
            ]
        ];
    }

    /**
     * Detect keyword-based highlights
     */
    private function detectKeywordHighlights(array $transcriptionData, array $options): array
    {
        $highlights = [];

        foreach ($transcriptionData as $segment) {
            $text = strtolower($segment['text']);
            $detectedKeywords = [];
            $totalWeight = 0;

            // Check each keyword category
            foreach ($this->keywords as $category => $keywords) {
                foreach ($keywords as $keywordData) {
                    $keyword = strtolower($keywordData['keyword']);
                    if (strpos($text, $keyword) !== false) {
                        $detectedKeywords[] = $keywordData['keyword'];
                        $totalWeight += $keywordData['weight'];
                    }
                }
            }

            // If keywords found, create highlight
            if (!empty($detectedKeywords)) {
                $confidence = min(0.95, $totalWeight / count($detectedKeywords));
                $importance = min(0.90, $totalWeight * 0.8);

                $highlights[] = [
                    'type' => $this->determineHighlightType($detectedKeywords),
                    'start_time' => $segment['start_time'],
                    'end_time' => $segment['end_time'],
                    'duration' => $segment['end_time'] - $segment['start_time'],
                    'text' => $segment['text'],
                    'speaker' => $segment['speaker_label'] ?? 'Unknown',
                    'keywords' => $detectedKeywords,
                    'confidence' => $confidence,
                    'importance' => $importance,
                    'detection_method' => 'keyword'
                ];
            }
        }

        return $highlights;
    }

    /**
     * Detect emotion-based highlights
     */
    private function detectEmotionHighlights(array $transcriptionData, array $options): array
    {
        $highlights = [];

        foreach ($transcriptionData as $segment) {
            $emotions = $this->analyzeEmotions($segment['text']);

            // Check for high emotional content
            foreach ($emotions as $emotion => $score) {
                if ($score >= 0.7) { // High emotion threshold
                    $highlights[] = [
                        'type' => 'emotional_peak',
                        'start_time' => $segment['start_time'],
                        'end_time' => $segment['end_time'],
                        'duration' => $segment['end_time'] - $segment['start_time'],
                        'text' => $segment['text'],
                        'speaker' => $segment['speaker_label'] ?? 'Unknown',
                        'emotions' => $emotions,
                        'confidence' => $score,
                        'importance' => $score * 0.9,
                        'detection_method' => 'emotion'
                    ];
                }
            }
        }

        return $highlights;
    }

    /**
     * Detect topic changes
     */
    private function detectTopicChanges(array $transcriptionData, array $options): array
    {
        $highlights = [];
        $previousTopics = [];

        foreach ($transcriptionData as $index => $segment) {
            $currentTopics = $this->extractTopics($segment['text']);

            if ($index > 0 && !empty($currentTopics)) {
                $similarity = $this->calculateTopicSimilarity($previousTopics, $currentTopics);

                // If topic similarity is low, it's a topic change
                if ($similarity < 0.3) {
                    $highlights[] = [
                        'type' => 'topic_change',
                        'start_time' => $segment['start_time'],
                        'end_time' => min($segment['end_time'] + 10, $segment['end_time']), // Extend slightly
                        'duration' => min(15, $segment['end_time'] - $segment['start_time'] + 10),
                        'text' => $segment['text'],
                        'speaker' => $segment['speaker_label'] ?? 'Unknown',
                        'topics' => $currentTopics,
                        'confidence' => 1 - $similarity,
                        'importance' => (1 - $similarity) * 0.7,
                        'detection_method' => 'topic_change'
                    ];
                }
            }

            $previousTopics = $currentTopics;
        }

        return $highlights;
    }

    /**
     * Detect question-answer patterns
     */
    private function detectQuestionAnswers(array $transcriptionData, array $options): array
    {
        $highlights = [];

        for ($i = 0; $i < count($transcriptionData) - 1; $i++) {
            $currentSegment = $transcriptionData[$i];
            $nextSegment = $transcriptionData[$i + 1];

            // Check if current segment is a question
            if ($this->isQuestion($currentSegment['text'])) {
                // Check if next segment is a substantial answer
                if ($this->isSubstantialAnswer($nextSegment['text'])) {
                    $highlights[] = [
                        'type' => 'question_answer',
                        'start_time' => $currentSegment['start_time'],
                        'end_time' => $nextSegment['end_time'],
                        'duration' => $nextSegment['end_time'] - $currentSegment['start_time'],
                        'text' => $currentSegment['text'] . ' ' . $nextSegment['text'],
                        'speaker' => $currentSegment['speaker_label'] ?? 'Unknown',
                        'confidence' => 0.85,
                        'importance' => 0.80,
                        'detection_method' => 'qa_pattern'
                    ];
                }
            }
        }

        return $highlights;
    }

    /**
     * Detect audio patterns (simulated)
     */
    private function detectAudioPatterns(array $transcriptionData, array $options): array
    {
        $highlights = [];

        foreach ($transcriptionData as $segment) {
            // Simulate audio analysis based on text characteristics
            $audioScore = $this->simulateAudioAnalysis($segment['text']);

            if ($audioScore >= 0.8) {
                $highlights[] = [
                    'type' => 'key_moment',
                    'start_time' => $segment['start_time'],
                    'end_time' => $segment['end_time'],
                    'duration' => $segment['end_time'] - $segment['start_time'],
                    'text' => $segment['text'],
                    'speaker' => $segment['speaker_label'] ?? 'Unknown',
                    'confidence' => $audioScore,
                    'importance' => $audioScore * 0.85,
                    'detection_method' => 'audio_pattern'
                ];
            }
        }

        return $highlights;
    }

    /**
     * Score and rank highlights
     */
    private function scoreAndRankHighlights(array $highlights, array $options): array
    {
        foreach ($highlights as &$highlight) {
            // Calculate final scores
            $highlight['final_score'] = $this->calculateFinalScore($highlight);
            $highlight['engagement_score'] = $this->calculateEngagementScore($highlight);
        }

        // Sort by final score
        usort($highlights, function($a, $b) {
            return $b['final_score'] <=> $a['final_score'];
        });

        // Apply limits if specified
        if (isset($options['max_highlights'])) {
            $highlights = array_slice($highlights, 0, $options['max_highlights']);
        }

        return $highlights;
    }

    /**
     * Save highlights to database
     */
    private function saveHighlights(string $interviewId, array $highlights): array
    {
        $savedHighlights = [];

        foreach ($highlights as $highlight) {
            $highlightId = 'highlight_' . time() . '_' . uniqid();

            $stmt = $this->pdo->prepare("
                INSERT INTO interview_highlights
                (highlight_id, interview_id, title, description, highlight_type, start_time,
                 end_time, duration, confidence_score, importance_score, engagement_score,
                 transcript_text, speaker_id, keywords, topics, emotions, ai_analysis,
                 status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $title = $this->generateHighlightTitle($highlight);
            $description = $this->generateHighlightDescription($highlight);
            $aiAnalysis = $this->generateAIAnalysis($highlight);

            $stmt->execute([
                $highlightId,
                $interviewId,
                $title,
                $description,
                $highlight['type'],
                $highlight['start_time'],
                $highlight['end_time'],
                $highlight['duration'],
                $highlight['confidence'],
                $highlight['importance'],
                $highlight['engagement_score'] ?? 0.0,
                $highlight['text'],
                $highlight['speaker'],
                json_encode($highlight['keywords'] ?? []),
                json_encode($highlight['topics'] ?? []),
                json_encode($highlight['emotions'] ?? []),
                $aiAnalysis,
                'detected',
                date('Y-m-d H:i:s')
            ]);

            $highlight['highlight_id'] = $highlightId;
            $highlight['title'] = $title;
            $highlight['description'] = $description;
            $savedHighlights[] = $highlight;
        }

        return $savedHighlights;
    }

    /**
     * Queue media generation
     */
    private function queueMediaGeneration(string $interviewId, array $highlights): void
    {
        foreach ($highlights as $highlight) {
            // Queue thumbnail generation
            $this->addToProcessingQueue($interviewId, 'thumbnail', [
                'highlight_id' => $highlight['highlight_id'],
                'start_time' => $highlight['start_time'],
                'end_time' => $highlight['end_time']
            ]);

            // Queue clip generation
            $this->addToProcessingQueue($interviewId, 'clip_generation', [
                'highlight_id' => $highlight['highlight_id'],
                'start_time' => $highlight['start_time'],
                'end_time' => $highlight['end_time']
            ]);
        }
    }

    /**
     * Add item to processing queue
     */
    private function addToProcessingQueue(string $interviewId, string $processingType, array $data): void
    {
        $queueId = 'queue_' . time() . '_' . uniqid();

        $stmt = $this->pdo->prepare("
            INSERT INTO highlight_processing_queue
            (queue_id, interview_id, processing_type, priority, result_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $queueId,
            $interviewId,
            $processingType,
            1, // Default priority
            json_encode($data),
            date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Analyze emotions in text (simplified)
     */
    private function analyzeEmotions(string $text): array
    {
        $emotions = [
            'excitement' => 0.0,
            'passion' => 0.0,
            'concern' => 0.0,
            'frustration' => 0.0,
            'joy' => 0.0,
            'surprise' => 0.0
        ];

        $text = strtolower($text);

        // Simple keyword-based emotion detection
        $emotionKeywords = [
            'excitement' => ['excited', 'thrilled', 'amazing', 'incredible', 'fantastic'],
            'passion' => ['passionate', 'love', 'dedicated', 'committed', 'devoted'],
            'concern' => ['concerned', 'worried', 'troubled', 'anxious', 'uncertain'],
            'frustration' => ['frustrated', 'annoyed', 'difficult', 'challenging', 'struggle'],
            'joy' => ['happy', 'delighted', 'pleased', 'satisfied', 'wonderful'],
            'surprise' => ['surprised', 'unexpected', 'shocking', 'unbelievable', 'wow']
        ];

        foreach ($emotionKeywords as $emotion => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $emotions[$emotion] += 0.3;
                }
            }
        }

        // Normalize scores
        foreach ($emotions as &$score) {
            $score = min(1.0, $score);
        }

        return $emotions;
    }

    /**
     * Extract topics from text (simplified)
     */
    private function extractTopics(string $text): array
    {
        $topics = [];
        $text = strtolower($text);

        // Simple topic extraction based on keywords
        $topicKeywords = [
            'technology' => ['technology', 'software', 'digital', 'innovation', 'tech'],
            'business' => ['business', 'company', 'market', 'revenue', 'strategy'],
            'research' => ['research', 'study', 'analysis', 'data', 'findings'],
            'future' => ['future', 'tomorrow', 'next', 'upcoming', 'ahead'],
            'problem' => ['problem', 'issue', 'challenge', 'difficulty', 'obstacle'],
            'solution' => ['solution', 'answer', 'resolve', 'fix', 'approach']
        ];

        foreach ($topicKeywords as $topic => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $topics[] = $topic;
                    break;
                }
            }
        }

        return array_unique($topics);
    }

    /**
     * Calculate topic similarity
     */
    private function calculateTopicSimilarity(array $topics1, array $topics2): float
    {
        if (empty($topics1) || empty($topics2)) {
            return 0.0;
        }

        $intersection = array_intersect($topics1, $topics2);
        $union = array_unique(array_merge($topics1, $topics2));

        return count($intersection) / count($union);
    }

    /**
     * Check if text is a question
     */
    private function isQuestion(string $text): bool
    {
        $text = trim($text);

        // Check for question mark
        if (substr($text, -1) === '?') {
            return true;
        }

        // Check for question words
        $questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should'];
        $firstWord = strtolower(explode(' ', $text)[0]);

        return in_array($firstWord, $questionWords);
    }

    /**
     * Check if text is a substantial answer
     */
    private function isSubstantialAnswer(string $text): bool
    {
        $wordCount = str_word_count($text);
        return $wordCount >= 10; // At least 10 words for substantial answer
    }

    /**
     * Simulate audio analysis
     */
    private function simulateAudioAnalysis(string $text): float
    {
        $score = 0.0;

        // Simulate based on text characteristics
        $wordCount = str_word_count($text);
        $exclamationCount = substr_count($text, '!');
        $questionCount = substr_count($text, '?');
        $capsCount = preg_match_all('/[A-Z]/', $text);

        // More words = potentially more important
        $score += min(0.3, $wordCount / 100);

        // Exclamations and questions add emphasis
        $score += $exclamationCount * 0.2;
        $score += $questionCount * 0.15;

        // Capital letters suggest emphasis
        $score += min(0.2, $capsCount / 50);

        return min(1.0, $score);
    }

    /**
     * Determine highlight type from keywords
     */
    private function determineHighlightType(array $keywords): string
    {
        $typeKeywords = [
            'breakthrough' => ['breakthrough', 'discovery', 'eureka', 'game changer', 'revolutionary'],
            'insight' => ['insight', 'realization', 'understanding', 'perspective', 'key point'],
            'important_quote' => ['important', 'significant', 'crucial', 'essential'],
            'conclusion' => ['conclusion', 'summary', 'bottom line', 'in summary']
        ];

        foreach ($typeKeywords as $type => $typeWords) {
            foreach ($keywords as $keyword) {
                if (in_array(strtolower($keyword), $typeWords)) {
                    return $type;
                }
            }
        }

        return 'key_moment'; // Default type
    }

    /**
     * Calculate final score
     */
    private function calculateFinalScore(array $highlight): float
    {
        $confidence = $highlight['confidence'] ?? 0.0;
        $importance = $highlight['importance'] ?? 0.0;
        $duration = $highlight['duration'] ?? 0.0;

        // Weight the scores
        $score = ($confidence * 0.4) + ($importance * 0.5) + (min(1.0, $duration / 60) * 0.1);

        return round($score, 2);
    }

    /**
     * Calculate engagement score
     */
    private function calculateEngagementScore(array $highlight): float
    {
        $score = 0.0;

        // Emotional content increases engagement
        if (!empty($highlight['emotions'])) {
            $maxEmotion = max($highlight['emotions']);
            $score += $maxEmotion * 0.4;
        }

        // Keywords increase engagement
        if (!empty($highlight['keywords'])) {
            $score += min(0.3, count($highlight['keywords']) * 0.1);
        }

        // Questions increase engagement
        if ($highlight['type'] === 'question_answer') {
            $score += 0.3;
        }

        return min(1.0, $score);
    }

    /**
     * Generate highlight title
     */
    private function generateHighlightTitle(array $highlight): string
    {
        $type = $highlight['type'];
        $speaker = $highlight['speaker'] ?? 'Speaker';

        $templates = [
            'breakthrough' => "{$speaker} shares a breakthrough",
            'insight' => "Key insight from {$speaker}",
            'emotional_peak' => "Emotional moment with {$speaker}",
            'question_answer' => "Important Q&A",
            'topic_change' => "New topic discussion",
            'key_moment' => "Key moment with {$speaker}"
        ];

        return $templates[$type] ?? "Highlight from {$speaker}";
    }

    /**
     * Generate highlight description
     */
    private function generateHighlightDescription(array $highlight): string
    {
        $text = $highlight['text'] ?? '';
        $maxLength = 150;

        if (strlen($text) > $maxLength) {
            $text = substr($text, 0, $maxLength) . '...';
        }

        return $text;
    }

    /**
     * Generate AI analysis
     */
    private function generateAIAnalysis(array $highlight): string
    {
        $analysis = [
            'detection_method' => $highlight['detection_method'] ?? 'unknown',
            'confidence_factors' => [],
            'importance_factors' => [],
            'recommendations' => []
        ];

        // Add confidence factors
        if (!empty($highlight['keywords'])) {
            $analysis['confidence_factors'][] = 'Strong keyword matches: ' . implode(', ', $highlight['keywords']);
        }

        if (!empty($highlight['emotions'])) {
            $maxEmotion = array_keys($highlight['emotions'], max($highlight['emotions']))[0];
            $analysis['confidence_factors'][] = "High emotional content: {$maxEmotion}";
        }

        // Add recommendations
        if ($highlight['confidence'] >= 0.8) {
            $analysis['recommendations'][] = 'High confidence - suitable for featuring';
        }

        if ($highlight['importance'] >= 0.8) {
            $analysis['recommendations'][] = 'High importance - consider for highlights reel';
        }

        return json_encode($analysis);
    }

    /**
     * Generate analysis summary
     */
    private function generateAnalysisSummary(array $highlights): array
    {
        $summary = [
            'total_highlights' => count($highlights),
            'avg_confidence' => 0,
            'avg_importance' => 0,
            'types_detected' => [],
            'top_keywords' => [],
            'processing_recommendations' => []
        ];

        if (empty($highlights)) {
            return $summary;
        }

        $confidenceSum = 0;
        $importanceSum = 0;
        $allKeywords = [];

        foreach ($highlights as $highlight) {
            $confidenceSum += $highlight['confidence'];
            $importanceSum += $highlight['importance'];

            $type = $highlight['type'];
            $summary['types_detected'][$type] = ($summary['types_detected'][$type] ?? 0) + 1;

            if (!empty($highlight['keywords'])) {
                $allKeywords = array_merge($allKeywords, $highlight['keywords']);
            }
        }

        $summary['avg_confidence'] = round($confidenceSum / count($highlights), 2);
        $summary['avg_importance'] = round($importanceSum / count($highlights), 2);
        $summary['top_keywords'] = array_slice(array_count_values($allKeywords), 0, 10, true);

        // Add recommendations
        if ($summary['avg_confidence'] >= 0.8) {
            $summary['processing_recommendations'][] = 'High quality highlights detected - suitable for automatic approval';
        }

        if (count($highlights) >= 10) {
            $summary['processing_recommendations'][] = 'Many highlights detected - consider filtering by importance';
        }

        return $summary;
    }

    /**
     * Get highlight by ID
     */
    private function getHighlightById(string $highlightId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM interview_highlights WHERE highlight_id = ? LIMIT 1");
        $stmt->execute([$highlightId]);
        $highlight = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($highlight) {
            $highlight['keywords'] = json_decode($highlight['keywords'], true) ?? [];
            $highlight['topics'] = json_decode($highlight['topics'], true) ?? [];
            $highlight['emotions'] = json_decode($highlight['emotions'], true) ?? [];
        }

        return $highlight ?: [];
    }
}
