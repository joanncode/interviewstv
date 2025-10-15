<?php

namespace App\Services;

/**
 * Translation Service
 * Handles real-time translation for transcriptions and chat messages
 */
class TranslationService
{
    private $pdo;
    private $defaultEngine;
    private $apiKeys;
    private $cacheEnabled;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->defaultEngine = 'google_translate';
        $this->cacheEnabled = true;
        
        // API keys would be loaded from environment or config
        $this->apiKeys = [
            'google_translate' => $_ENV['GOOGLE_TRANSLATE_API_KEY'] ?? 'demo_key',
            'azure' => $_ENV['AZURE_TRANSLATOR_KEY'] ?? 'demo_key',
            'aws' => $_ENV['AWS_TRANSLATE_KEY'] ?? 'demo_key'
        ];
    }

    /**
     * Start real-time translation session
     */
    public function startTranslationSession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'trans_session_' . time() . '_' . uniqid();
            
            $sourceLanguage = $options['source_language'] ?? 'en';
            $targetLanguages = $options['target_languages'] ?? ['es', 'fr'];
            $engine = $options['translation_engine'] ?? $this->defaultEngine;
            
            // Validate languages
            $this->validateLanguages($sourceLanguage, $targetLanguages);
            
            // Create translation session
            $stmt = $this->pdo->prepare("
                INSERT INTO translation_sessions 
                (session_id, interview_id, user_id, source_language, target_languages, 
                 auto_translate, translate_transcription, translate_chat, translation_engine, 
                 quality_threshold, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $sessionId,
                $interviewId,
                $userId,
                $sourceLanguage,
                json_encode($targetLanguages),
                $options['auto_translate'] ?? true,
                $options['translate_transcription'] ?? true,
                $options['translate_chat'] ?? true,
                $engine,
                $options['quality_threshold'] ?? 0.70,
                date('Y-m-d H:i:s')
            ]);
            
            return [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'source_language' => $sourceLanguage,
                'target_languages' => $targetLanguages,
                'translation_engine' => $engine,
                'supported_languages' => $this->getSupportedLanguages(),
                'status' => 'active'
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to start translation session: ' . $e->getMessage());
        }
    }

    /**
     * Translate text in real-time
     */
    public function translateText(string $text, string $sourceLanguage, string $targetLanguage, array $options = []): array
    {
        try {
            $requestId = 'trans_req_' . time() . '_' . uniqid();
            $engine = $options['engine'] ?? $this->defaultEngine;
            $sourceType = $options['source_type'] ?? 'text';
            $sourceId = $options['source_id'] ?? null;
            $interviewId = $options['interview_id'] ?? null;
            
            // Check cache first
            if ($this->cacheEnabled) {
                $cachedTranslation = $this->getCachedTranslation($text, $sourceLanguage, $targetLanguage);
                if ($cachedTranslation) {
                    $this->updateCacheUsage($cachedTranslation['id']);
                    return [
                        'request_id' => $requestId,
                        'original_text' => $text,
                        'translated_text' => $cachedTranslation['translated_text'],
                        'source_language' => $sourceLanguage,
                        'target_language' => $targetLanguage,
                        'confidence_score' => $cachedTranslation['confidence_score'],
                        'processing_time_ms' => 5, // Cache hit is very fast
                        'status' => 'completed',
                        'cached' => true,
                        'translation_engine' => $cachedTranslation['translation_engine']
                    ];
                }
            }
            
            // Create translation request record
            $this->createTranslationRequest($requestId, $sourceType, $sourceId, $interviewId, 
                                          $sourceLanguage, $targetLanguage, $text, $engine);
            
            // Perform translation
            $startTime = microtime(true);
            $translationResult = $this->performTranslation($text, $sourceLanguage, $targetLanguage, $engine);
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            // Update request with result
            $this->updateTranslationRequest($requestId, $translationResult, $processingTime);
            
            // Cache the result
            if ($this->cacheEnabled && $translationResult['status'] === 'completed') {
                $this->cacheTranslation($text, $sourceLanguage, $targetLanguage, 
                                      $translationResult['translated_text'], $engine, 
                                      $translationResult['confidence_score']);
            }
            
            // Update analytics
            $this->updateTranslationAnalytics($interviewId, $sourceLanguage, $targetLanguage, 
                                            $translationResult['status'], $processingTime, strlen($text));
            
            return array_merge($translationResult, [
                'request_id' => $requestId,
                'original_text' => $text,
                'source_language' => $sourceLanguage,
                'target_language' => $targetLanguage,
                'processing_time_ms' => $processingTime,
                'cached' => false,
                'translation_engine' => $engine
            ]);
            
        } catch (Exception $e) {
            throw new Exception('Failed to translate text: ' . $e->getMessage());
        }
    }

    /**
     * Translate multiple texts in batch
     */
    public function batchTranslate(array $texts, string $sourceLanguage, array $targetLanguages, array $options = []): array
    {
        try {
            $results = [];
            $engine = $options['engine'] ?? $this->defaultEngine;
            
            foreach ($texts as $index => $text) {
                foreach ($targetLanguages as $targetLanguage) {
                    $textOptions = array_merge($options, [
                        'source_id' => $options['source_ids'][$index] ?? null
                    ]);
                    
                    $result = $this->translateText($text, $sourceLanguage, $targetLanguage, $textOptions);
                    $results[] = $result;
                }
            }
            
            return [
                'batch_id' => 'batch_' . time() . '_' . uniqid(),
                'total_translations' => count($results),
                'successful' => count(array_filter($results, fn($r) => $r['status'] === 'completed')),
                'failed' => count(array_filter($results, fn($r) => $r['status'] === 'failed')),
                'cached' => count(array_filter($results, fn($r) => $r['cached'] === true)),
                'results' => $results
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to perform batch translation: ' . $e->getMessage());
        }
    }

    /**
     * Get translation session details
     */
    public function getTranslationSession(string $sessionId): array
    {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM translation_sessions WHERE session_id = ? LIMIT 1");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$session) {
                throw new Exception('Translation session not found');
            }
            
            $session['target_languages'] = json_decode($session['target_languages'], true);
            
            return $session;
            
        } catch (Exception $e) {
            throw new Exception('Failed to get translation session: ' . $e->getMessage());
        }
    }

    /**
     * Update translation session settings
     */
    public function updateTranslationSession(string $sessionId, array $updates): array
    {
        try {
            $allowedFields = [
                'target_languages', 'auto_translate', 'translate_transcription', 
                'translate_chat', 'translation_engine', 'quality_threshold', 'status'
            ];
            
            $updateFields = [];
            $updateValues = [];
            
            foreach ($updates as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $updateFields[] = "{$field} = ?";
                    $updateValues[] = $field === 'target_languages' ? json_encode($value) : $value;
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception('No valid fields to update');
            }
            
            $updateValues[] = date('Y-m-d H:i:s'); // updated_at
            $updateValues[] = $sessionId;
            
            $sql = "UPDATE translation_sessions SET " . implode(', ', $updateFields) . ", updated_at = ? WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($updateValues);
            
            return $this->getTranslationSession($sessionId);
            
        } catch (Exception $e) {
            throw new Exception('Failed to update translation session: ' . $e->getMessage());
        }
    }

    /**
     * Get supported languages
     */
    public function getSupportedLanguages(bool $activeOnly = true): array
    {
        try {
            $sql = "SELECT * FROM supported_languages";
            if ($activeOnly) {
                $sql .= " WHERE is_active = 1";
            }
            $sql .= " ORDER BY language_name ASC";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $languages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($languages as &$language) {
                $language['translation_engines'] = json_decode($language['translation_engines'], true);
            }
            
            return $languages;
            
        } catch (Exception $e) {
            throw new Exception('Failed to get supported languages: ' . $e->getMessage());
        }
    }

    /**
     * Detect language of text
     */
    public function detectLanguage(string $text): array
    {
        try {
            // For demo purposes, we'll use a simple detection algorithm
            // In production, this would use Google Translate API or similar
            
            $detectedLanguage = $this->simpleLanguageDetection($text);
            
            return [
                'detected_language' => $detectedLanguage,
                'confidence' => 0.85,
                'alternatives' => [
                    ['language' => 'en', 'confidence' => 0.15]
                ]
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to detect language: ' . $e->getMessage());
        }
    }

    /**
     * Get translation analytics
     */
    public function getTranslationAnalytics(string $interviewId = null, array $options = []): array
    {
        try {
            $dateRange = $options['date_range'] ?? 7; // Last 7 days
            $startDate = date('Y-m-d', strtotime("-{$dateRange} days"));
            
            $sql = "SELECT * FROM translation_analytics WHERE date >= ?";
            $params = [$startDate];
            
            if ($interviewId) {
                $sql .= " AND interview_id = ?";
                $params[] = $interviewId;
            }
            
            $sql .= " ORDER BY date DESC";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate summary statistics
            $summary = $this->calculateAnalyticsSummary($analytics);
            
            return [
                'summary' => $summary,
                'daily_analytics' => $analytics,
                'date_range' => $dateRange,
                'interview_id' => $interviewId
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to get translation analytics: ' . $e->getMessage());
        }
    }

    /**
     * Validate source and target languages
     */
    private function validateLanguages(string $sourceLanguage, array $targetLanguages): void
    {
        $supportedLanguages = array_column($this->getSupportedLanguages(), 'language_code');

        if (!in_array($sourceLanguage, $supportedLanguages)) {
            throw new Exception("Unsupported source language: {$sourceLanguage}");
        }

        foreach ($targetLanguages as $targetLanguage) {
            if (!in_array($targetLanguage, $supportedLanguages)) {
                throw new Exception("Unsupported target language: {$targetLanguage}");
            }
        }
    }

    /**
     * Get cached translation
     */
    private function getCachedTranslation(string $text, string $sourceLanguage, string $targetLanguage): ?array
    {
        $cacheKey = md5($text . $sourceLanguage . $targetLanguage);

        $stmt = $this->pdo->prepare("
            SELECT * FROM translation_cache
            WHERE cache_key = ? AND expires_at > ?
            LIMIT 1
        ");
        $stmt->execute([$cacheKey, date('Y-m-d H:i:s')]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update cache usage
     */
    private function updateCacheUsage(int $cacheId): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE translation_cache
            SET usage_count = usage_count + 1, last_used_at = ?
            WHERE id = ?
        ");
        $stmt->execute([date('Y-m-d H:i:s'), $cacheId]);
    }

    /**
     * Create translation request record
     */
    private function createTranslationRequest(string $requestId, string $sourceType, ?string $sourceId,
                                            ?string $interviewId, string $sourceLanguage,
                                            string $targetLanguage, string $text, string $engine): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO translation_requests
            (request_id, source_type, source_id, interview_id, source_language,
             target_language, original_text, translation_engine, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $requestId, $sourceType, $sourceId, $interviewId, $sourceLanguage,
            $targetLanguage, $text, $engine, date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Perform actual translation using selected engine
     */
    private function performTranslation(string $text, string $sourceLanguage, string $targetLanguage, string $engine): array
    {
        try {
            switch ($engine) {
                case 'google_translate':
                    return $this->translateWithGoogle($text, $sourceLanguage, $targetLanguage);
                case 'azure':
                    return $this->translateWithAzure($text, $sourceLanguage, $targetLanguage);
                case 'aws':
                    return $this->translateWithAWS($text, $sourceLanguage, $targetLanguage);
                default:
                    return $this->translateWithDemo($text, $sourceLanguage, $targetLanguage);
            }
        } catch (Exception $e) {
            return [
                'translated_text' => $text, // Fallback to original text
                'confidence_score' => 0.0,
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ];
        }
    }

    /**
     * Demo translation (for development/testing)
     */
    private function translateWithDemo(string $text, string $sourceLanguage, string $targetLanguage): array
    {
        // Simple demo translation - just adds language prefix
        $languageNames = [
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

        $targetLanguageName = $languageNames[$targetLanguage] ?? $targetLanguage;
        $translatedText = "[{$targetLanguageName}] " . $text;

        return [
            'translated_text' => $translatedText,
            'confidence_score' => 0.85,
            'status' => 'completed'
        ];
    }

    /**
     * Google Translate API integration
     */
    private function translateWithGoogle(string $text, string $sourceLanguage, string $targetLanguage): array
    {
        // In production, this would make actual API calls to Google Translate
        // For demo purposes, we'll simulate the response

        $simulatedTranslations = [
            'en_es' => ['Hello' => 'Hola', 'How are you?' => '¿Cómo estás?', 'Thank you' => 'Gracias'],
            'en_fr' => ['Hello' => 'Bonjour', 'How are you?' => 'Comment allez-vous?', 'Thank you' => 'Merci'],
            'en_de' => ['Hello' => 'Hallo', 'How are you?' => 'Wie geht es dir?', 'Thank you' => 'Danke'],
        ];

        $key = $sourceLanguage . '_' . $targetLanguage;
        $translatedText = $simulatedTranslations[$key][$text] ?? "[Google] " . $text;

        return [
            'translated_text' => $translatedText,
            'confidence_score' => 0.92,
            'status' => 'completed'
        ];
    }

    /**
     * Azure Translator API integration
     */
    private function translateWithAzure(string $text, string $sourceLanguage, string $targetLanguage): array
    {
        // Simulated Azure translation
        return [
            'translated_text' => "[Azure] " . $text,
            'confidence_score' => 0.90,
            'status' => 'completed'
        ];
    }

    /**
     * AWS Translate API integration
     */
    private function translateWithAWS(string $text, string $sourceLanguage, string $targetLanguage): array
    {
        // Simulated AWS translation
        return [
            'translated_text' => "[AWS] " . $text,
            'confidence_score' => 0.88,
            'status' => 'completed'
        ];
    }

    /**
     * Update translation request with result
     */
    private function updateTranslationRequest(string $requestId, array $result, int $processingTime): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE translation_requests
            SET translated_text = ?, confidence_score = ?, processing_time_ms = ?,
                status = ?, error_message = ?, completed_at = ?
            WHERE request_id = ?
        ");

        $stmt->execute([
            $result['translated_text'],
            $result['confidence_score'],
            $processingTime,
            $result['status'],
            $result['error_message'] ?? null,
            date('Y-m-d H:i:s'),
            $requestId
        ]);
    }

    /**
     * Cache translation result
     */
    private function cacheTranslation(string $text, string $sourceLanguage, string $targetLanguage,
                                    string $translatedText, string $engine, float $confidence): void
    {
        $cacheKey = md5($text . $sourceLanguage . $targetLanguage);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days')); // Cache for 7 days

        $stmt = $this->pdo->prepare("
            INSERT OR REPLACE INTO translation_cache
            (cache_key, source_text, source_language, target_language, translated_text,
             translation_engine, confidence_score, last_used_at, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $cacheKey, $text, $sourceLanguage, $targetLanguage, $translatedText,
            $engine, $confidence, date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), $expiresAt
        ]);
    }

    /**
     * Update translation analytics
     */
    private function updateTranslationAnalytics(string $interviewId, string $sourceLanguage,
                                              string $targetLanguage, string $status,
                                              int $processingTime, int $characterCount): void
    {
        $today = date('Y-m-d');

        // Check if analytics record exists for today
        $stmt = $this->pdo->prepare("
            SELECT id FROM translation_analytics
            WHERE interview_id = ? AND date = ?
            LIMIT 1
        ");
        $stmt->execute([$interviewId, $today]);
        $analyticsId = $stmt->fetchColumn();

        if ($analyticsId) {
            // Update existing record
            $stmt = $this->pdo->prepare("
                UPDATE translation_analytics
                SET total_requests = total_requests + 1,
                    successful_translations = successful_translations + ?,
                    failed_translations = failed_translations + ?,
                    total_characters_translated = total_characters_translated + ?,
                    updated_at = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $status === 'completed' ? 1 : 0,
                $status === 'failed' ? 1 : 0,
                $characterCount,
                date('Y-m-d H:i:s'),
                $analyticsId
            ]);
        } else {
            // Create new record
            $stmt = $this->pdo->prepare("
                INSERT INTO translation_analytics
                (interview_id, date, total_requests, successful_translations, failed_translations,
                 total_characters_translated, most_used_source_language, most_used_target_language,
                 created_at)
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $interviewId, $today,
                $status === 'completed' ? 1 : 0,
                $status === 'failed' ? 1 : 0,
                $characterCount,
                $sourceLanguage,
                $targetLanguage,
                date('Y-m-d H:i:s')
            ]);
        }
    }

    /**
     * Simple language detection (demo implementation)
     */
    private function simpleLanguageDetection(string $text): string
    {
        // Simple keyword-based detection for demo
        $languageKeywords = [
            'en' => ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'],
            'es' => ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no'],
            'fr' => ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
            'de' => ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        ];

        $text = strtolower($text);
        $scores = [];

        foreach ($languageKeywords as $lang => $keywords) {
            $score = 0;
            foreach ($keywords as $keyword) {
                $score += substr_count($text, $keyword);
            }
            $scores[$lang] = $score;
        }

        return array_keys($scores, max($scores))[0] ?? 'en';
    }

    /**
     * Calculate analytics summary
     */
    private function calculateAnalyticsSummary(array $analytics): array
    {
        if (empty($analytics)) {
            return [
                'total_requests' => 0,
                'success_rate' => 0,
                'average_processing_time' => 0,
                'total_characters' => 0,
                'most_used_languages' => []
            ];
        }

        $totalRequests = array_sum(array_column($analytics, 'total_requests'));
        $successfulTranslations = array_sum(array_column($analytics, 'successful_translations'));
        $totalCharacters = array_sum(array_column($analytics, 'total_characters_translated'));

        return [
            'total_requests' => $totalRequests,
            'success_rate' => $totalRequests > 0 ? round(($successfulTranslations / $totalRequests) * 100, 2) : 0,
            'average_processing_time' => array_sum(array_column($analytics, 'average_processing_time')) / count($analytics),
            'total_characters' => $totalCharacters,
            'most_used_languages' => $this->getMostUsedLanguages($analytics)
        ];
    }

    /**
     * Get most used languages from analytics
     */
    private function getMostUsedLanguages(array $analytics): array
    {
        $sourceLanguages = array_count_values(array_column($analytics, 'most_used_source_language'));
        $targetLanguages = array_count_values(array_column($analytics, 'most_used_target_language'));

        arsort($sourceLanguages);
        arsort($targetLanguages);

        return [
            'source' => array_slice($sourceLanguages, 0, 5, true),
            'target' => array_slice($targetLanguages, 0, 5, true)
        ];
    }
}
