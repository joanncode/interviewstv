<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * AI Service for Interviews.tv
 * Handles AI-powered features with toggle controls
 */
class AIService
{
    private PDO $pdo;
    private array $config;
    private array $enabledFeatures;
    private string $openaiApiKey;
    private string $whisperApiKey;
    private string $moderationApiKey;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'openai_api_key' => $_ENV['OPENAI_API_KEY'] ?? '',
            'whisper_api_key' => $_ENV['WHISPER_API_KEY'] ?? '',
            'moderation_api_key' => $_ENV['MODERATION_API_KEY'] ?? '',
            'transcription_enabled' => true,
            'content_suggestions_enabled' => true,
            'ai_moderation_enabled' => true,
            'sentiment_analysis_enabled' => true,
            'auto_tagging_enabled' => true,
            'content_enhancement_enabled' => true,
            'max_transcription_length' => 3600, // 1 hour
            'confidence_threshold' => 0.8,
            'moderation_threshold' => 0.7
        ], $config);

        $this->openaiApiKey = $this->config['openai_api_key'];
        $this->whisperApiKey = $this->config['whisper_api_key'];
        $this->moderationApiKey = $this->config['moderation_api_key'];
        
        $this->loadEnabledFeatures();
    }

    /**
     * Load enabled AI features from database
     */
    private function loadEnabledFeatures(): void
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT feature_name, is_enabled, settings 
                FROM ai_feature_settings 
                WHERE is_active = TRUE
            ");
            $stmt->execute();
            $features = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->enabledFeatures = [];
            foreach ($features as $feature) {
                $this->enabledFeatures[$feature['feature_name']] = [
                    'enabled' => (bool)$feature['is_enabled'],
                    'settings' => json_decode($feature['settings'], true) ?? []
                ];
            }
        } catch (Exception $e) {
            error_log("Failed to load AI features: " . $e->getMessage());
            $this->enabledFeatures = [];
        }
    }

    /**
     * Check if a specific AI feature is enabled
     */
    public function isFeatureEnabled(string $featureName): bool
    {
        return $this->enabledFeatures[$featureName]['enabled'] ?? false;
    }

    /**
     * Toggle AI feature on/off
     */
    public function toggleFeature(string $featureName, bool $enabled, array $settings = []): bool
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO ai_feature_settings (feature_name, is_enabled, settings, updated_at)
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                is_enabled = VALUES(is_enabled),
                settings = VALUES(settings),
                updated_at = NOW()
            ");
            
            $result = $stmt->execute([
                $featureName,
                $enabled,
                json_encode($settings)
            ]);

            if ($result) {
                $this->enabledFeatures[$featureName] = [
                    'enabled' => $enabled,
                    'settings' => $settings
                ];
            }

            return $result;

        } catch (Exception $e) {
            error_log("Failed to toggle AI feature: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Transcribe audio/video content
     */
    public function transcribeContent(string $audioFilePath, array $options = []): array
    {
        if (!$this->isFeatureEnabled('transcription')) {
            throw new Exception('AI transcription is disabled');
        }

        try {
            // Validate file
            if (!file_exists($audioFilePath)) {
                throw new Exception('Audio file not found');
            }

            $fileSize = filesize($audioFilePath);
            if ($fileSize > 25 * 1024 * 1024) { // 25MB limit
                throw new Exception('Audio file too large for transcription');
            }

            // Prepare API request
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/audio/transcriptions',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->whisperApiKey,
                ],
                CURLOPT_POSTFIELDS => [
                    'file' => new \CURLFile($audioFilePath),
                    'model' => $options['model'] ?? 'whisper-1',
                    'language' => $options['language'] ?? 'en',
                    'response_format' => 'verbose_json',
                    'timestamp_granularities' => json_encode(['word', 'segment'])
                ]
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Transcription API error: ' . $response);
            }

            $result = json_decode($response, true);
            
            // Store transcription in database
            $transcriptionId = $this->storeTranscription($result, $options);

            return [
                'transcription_id' => $transcriptionId,
                'text' => $result['text'],
                'segments' => $result['segments'] ?? [],
                'words' => $result['words'] ?? [],
                'language' => $result['language'] ?? 'en',
                'duration' => $result['duration'] ?? 0,
                'confidence' => $this->calculateConfidence($result)
            ];

        } catch (Exception $e) {
            error_log("Transcription failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate content suggestions for interviews
     */
    public function generateContentSuggestions(string $content, string $type = 'interview'): array
    {
        if (!$this->isFeatureEnabled('content_suggestions')) {
            throw new Exception('AI content suggestions are disabled');
        }

        try {
            $prompts = [
                'interview' => "Based on this interview content, suggest 5 engaging follow-up questions and 3 key topics to explore further:",
                'business' => "Based on this business content, suggest 5 strategic questions and 3 growth opportunities:",
                'education' => "Based on this educational content, suggest 5 learning objectives and 3 practical applications:"
            ];

            $prompt = $prompts[$type] ?? $prompts['interview'];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->openaiApiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => 'gpt-4',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are an expert interview coach and content strategist. Provide actionable, specific suggestions.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt . "\n\nContent: " . substr($content, 0, 4000)
                        ]
                    ],
                    'max_tokens' => 1000,
                    'temperature' => 0.7
                ])
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Content suggestions API error: ' . $response);
            }

            $result = json_decode($response, true);
            $suggestions = $result['choices'][0]['message']['content'] ?? '';

            // Parse and structure suggestions
            $structuredSuggestions = $this->parseContentSuggestions($suggestions);

            // Store suggestions
            $this->storeSuggestions($content, $structuredSuggestions, $type);

            return $structuredSuggestions;

        } catch (Exception $e) {
            error_log("Content suggestions failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Moderate content using AI
     */
    public function moderateContent(string $content, string $type = 'text'): array
    {
        if (!$this->isFeatureEnabled('ai_moderation')) {
            throw new Exception('AI moderation is disabled');
        }

        try {
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/moderations',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->moderationApiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'input' => $content,
                    'model' => 'text-moderation-latest'
                ])
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Moderation API error: ' . $response);
            }

            $result = json_decode($response, true);
            $moderation = $result['results'][0] ?? [];

            $moderationResult = [
                'flagged' => $moderation['flagged'] ?? false,
                'categories' => $moderation['categories'] ?? [],
                'category_scores' => $moderation['category_scores'] ?? [],
                'action_required' => $this->determineModerationAction($moderation),
                'confidence' => $this->calculateModerationConfidence($moderation)
            ];

            // Store moderation result
            $this->storeModerationResult($content, $moderationResult, $type);

            return $moderationResult;

        } catch (Exception $e) {
            error_log("Content moderation failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Analyze sentiment of content
     */
    public function analyzeSentiment(string $content): array
    {
        if (!$this->isFeatureEnabled('sentiment_analysis')) {
            throw new Exception('AI sentiment analysis is disabled');
        }

        try {
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->openaiApiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => 'gpt-3.5-turbo',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Analyze the sentiment of the following text. Return a JSON object with sentiment (positive/negative/neutral), confidence (0-1), and key emotions detected.'
                        ],
                        [
                            'role' => 'user',
                            'content' => substr($content, 0, 2000)
                        ]
                    ],
                    'max_tokens' => 200,
                    'temperature' => 0.3
                ])
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Sentiment analysis API error: ' . $response);
            }

            $result = json_decode($response, true);
            $sentimentText = $result['choices'][0]['message']['content'] ?? '{}';
            
            // Parse JSON response
            $sentiment = json_decode($sentimentText, true) ?? [
                'sentiment' => 'neutral',
                'confidence' => 0.5,
                'emotions' => []
            ];

            return $sentiment;

        } catch (Exception $e) {
            error_log("Sentiment analysis failed: " . $e->getMessage());
            return [
                'sentiment' => 'neutral',
                'confidence' => 0.0,
                'emotions' => [],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate automatic tags for content
     */
    public function generateTags(string $content, int $maxTags = 10): array
    {
        if (!$this->isFeatureEnabled('auto_tagging')) {
            throw new Exception('AI auto-tagging is disabled');
        }

        try {
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->openaiApiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => 'gpt-3.5-turbo',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => "Generate relevant tags for this content. Return only a JSON array of strings, maximum {$maxTags} tags. Focus on topics, industries, skills, and themes."
                        ],
                        [
                            'role' => 'user',
                            'content' => substr($content, 0, 3000)
                        ]
                    ],
                    'max_tokens' => 200,
                    'temperature' => 0.5
                ])
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Auto-tagging API error: ' . $response);
            }

            $result = json_decode($response, true);
            $tagsText = $result['choices'][0]['message']['content'] ?? '[]';
            
            $tags = json_decode($tagsText, true) ?? [];
            
            // Ensure we have an array and limit to maxTags
            if (!is_array($tags)) {
                $tags = [];
            }
            
            return array_slice($tags, 0, $maxTags);

        } catch (Exception $e) {
            error_log("Auto-tagging failed: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Enhance content with AI improvements
     */
    public function enhanceContent(string $content, string $enhancementType = 'improve'): array
    {
        if (!$this->isFeatureEnabled('content_enhancement')) {
            throw new Exception('AI content enhancement is disabled');
        }

        $prompts = [
            'improve' => 'Improve this content by making it more engaging, clear, and professional while maintaining the original meaning:',
            'summarize' => 'Create a concise summary of this content highlighting the key points:',
            'expand' => 'Expand this content with additional relevant details and examples:',
            'simplify' => 'Simplify this content to make it more accessible to a general audience:'
        ];

        try {
            $prompt = $prompts[$enhancementType] ?? $prompts['improve'];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->openaiApiKey,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => 'gpt-4',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are an expert content editor. Provide high-quality content improvements.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt . "\n\n" . substr($content, 0, 4000)
                        ]
                    ],
                    'max_tokens' => 2000,
                    'temperature' => 0.7
                ])
            ]);

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                throw new Exception('Content enhancement API error: ' . $response);
            }

            $result = json_decode($response, true);
            $enhancedContent = $result['choices'][0]['message']['content'] ?? '';

            return [
                'original_content' => $content,
                'enhanced_content' => $enhancedContent,
                'enhancement_type' => $enhancementType,
                'improvement_score' => $this->calculateImprovementScore($content, $enhancedContent)
            ];

        } catch (Exception $e) {
            error_log("Content enhancement failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get AI feature usage statistics
     */
    public function getUsageStatistics(int $userId = null, string $dateRange = '30d'): array
    {
        try {
            $whereClause = $userId ? "WHERE user_id = ?" : "";
            $params = $userId ? [$userId] : [];
            
            $dateFilter = match($dateRange) {
                '7d' => "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
                '30d' => "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
                '90d' => "AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)",
                default => "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            };

            $stmt = $this->pdo->prepare("
                SELECT 
                    feature_name,
                    COUNT(*) as usage_count,
                    AVG(processing_time) as avg_processing_time,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
                FROM ai_usage_logs 
                {$whereClause} {$dateFilter}
                GROUP BY feature_name
                ORDER BY usage_count DESC
            ");
            
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            error_log("Failed to get AI usage statistics: " . $e->getMessage());
            return [];
        }
    }

    // Private helper methods
    private function storeTranscription(array $transcriptionData, array $options): string
    {
        $transcriptionId = 'trans_' . bin2hex(random_bytes(8));
        
        $stmt = $this->pdo->prepare("
            INSERT INTO ai_transcriptions (
                id, text, segments, words, language, duration, 
                confidence, model_used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $transcriptionId,
            $transcriptionData['text'],
            json_encode($transcriptionData['segments'] ?? []),
            json_encode($transcriptionData['words'] ?? []),
            $transcriptionData['language'] ?? 'en',
            $transcriptionData['duration'] ?? 0,
            $this->calculateConfidence($transcriptionData),
            $options['model'] ?? 'whisper-1'
        ]);
        
        return $transcriptionId;
    }

    private function calculateConfidence(array $transcriptionData): float
    {
        if (isset($transcriptionData['segments'])) {
            $confidences = array_column($transcriptionData['segments'], 'avg_logprob');
            return !empty($confidences) ? array_sum($confidences) / count($confidences) : 0.8;
        }
        return 0.8;
    }

    private function parseContentSuggestions(string $suggestions): array
    {
        // Parse AI response into structured format
        $lines = explode("\n", $suggestions);
        $parsed = [
            'questions' => [],
            'topics' => [],
            'insights' => []
        ];

        $currentSection = null;
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            if (stripos($line, 'question') !== false) {
                $currentSection = 'questions';
            } elseif (stripos($line, 'topic') !== false) {
                $currentSection = 'topics';
            } elseif (stripos($line, 'insight') !== false) {
                $currentSection = 'insights';
            } elseif ($currentSection && (preg_match('/^\d+\./', $line) || preg_match('/^-/', $line))) {
                $parsed[$currentSection][] = preg_replace('/^\d+\.\s*|-\s*/', '', $line);
            }
        }

        return $parsed;
    }

    private function storeSuggestions(string $content, array $suggestions, string $type): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO ai_content_suggestions (
                content_hash, content_type, suggestions, created_at
            ) VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            md5($content),
            $type,
            json_encode($suggestions)
        ]);
    }

    private function storeModerationResult(string $content, array $result, string $type): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO ai_moderation_results (
                content_hash, content_type, flagged, categories, 
                category_scores, action_required, confidence, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            md5($content),
            $type,
            $result['flagged'],
            json_encode($result['categories']),
            json_encode($result['category_scores']),
            $result['action_required'],
            $result['confidence']
        ]);
    }

    private function determineModerationAction(array $moderation): string
    {
        if (!($moderation['flagged'] ?? false)) {
            return 'none';
        }

        $categories = $moderation['categories'] ?? [];
        $scores = $moderation['category_scores'] ?? [];

        // High-risk categories require immediate action
        $highRiskCategories = ['violence', 'hate', 'harassment', 'self-harm'];
        foreach ($highRiskCategories as $category) {
            if (($categories[$category] ?? false) && ($scores[$category] ?? 0) > 0.8) {
                return 'block';
            }
        }

        // Medium-risk categories require review
        if (max($scores) > $this->config['moderation_threshold']) {
            return 'review';
        }

        return 'warn';
    }

    private function calculateModerationConfidence(array $moderation): float
    {
        $scores = $moderation['category_scores'] ?? [];
        return !empty($scores) ? max($scores) : 0.0;
    }

    private function calculateImprovementScore(string $original, string $enhanced): float
    {
        // Simple improvement score based on length and complexity
        $originalLength = strlen($original);
        $enhancedLength = strlen($enhanced);

        if ($originalLength === 0) return 0.0;

        $lengthRatio = $enhancedLength / $originalLength;

        // Score based on reasonable length improvement
        if ($lengthRatio >= 1.1 && $lengthRatio <= 2.0) {
            return min(0.9, 0.5 + ($lengthRatio - 1.0) * 0.4);
        }

        return 0.5; // Default moderate improvement
    }

    /**
     * Log AI feature usage for analytics
     */
    private function logUsage(string $featureName, string $status, float $processingTime, int $userId = null): void
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO ai_usage_logs (
                    feature_name, user_id, status, processing_time, created_at
                ) VALUES (?, ?, ?, ?, NOW())
            ");

            $stmt->execute([$featureName, $userId, $status, $processingTime]);
        } catch (Exception $e) {
            error_log("Failed to log AI usage: " . $e->getMessage());
        }
    }
}
