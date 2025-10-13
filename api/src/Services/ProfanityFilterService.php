<?php

namespace InterviewsTV\Services;

/**
 * Advanced Profanity Filter Service
 * Comprehensive content filtering with multiple detection methods and customizable rules
 */
class ProfanityFilterService {
    
    private $fileStorageService;
    private $filterConfig;
    private $profanityLists;
    private $whitelistWords;
    private $contextPatterns;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->initializeFilterConfig();
        $this->loadProfanityLists();
        $this->loadWhitelist();
        $this->initializeContextPatterns();
    }
    
    /**
     * Initialize filter configuration
     */
    private function initializeFilterConfig() {
        $this->filterConfig = [
            'enabled' => true,
            'strict_mode' => false,
            'filter_methods' => [
                'exact_match' => true,
                'partial_match' => true,
                'leetspeak' => true,
                'phonetic' => true,
                'context_analysis' => true,
                'pattern_detection' => true
            ],
            'replacement_methods' => [
                'asterisk' => true,      // Replace with ***
                'emoji' => false,        // Replace with 🤬
                'custom' => false,       // Custom replacement text
                'remove' => false        // Remove entirely
            ],
            'severity_levels' => [
                'mild' => ['score' => 10, 'action' => 'replace'],
                'moderate' => ['score' => 25, 'action' => 'replace'],
                'severe' => ['score' => 50, 'action' => 'block'],
                'extreme' => ['score' => 100, 'action' => 'block']
            ],
            'language_support' => ['en', 'es', 'fr', 'de'],
            'custom_replacement' => '[FILTERED]',
            'preserve_length' => true,
            'case_sensitive' => false,
            'allow_partial_words' => false,
            'context_window' => 3, // Words before/after for context
            'learning_enabled' => true,
            'user_reports_enabled' => true
        ];
    }
    
    /**
     * Load profanity word lists
     */
    private function loadProfanityLists() {
        $this->profanityLists = [
            'mild' => [
                'damn', 'hell', 'crap', 'suck', 'stupid', 'idiot', 'moron', 'jerk',
                'dumb', 'lame', 'loser', 'freak', 'weird', 'crazy', 'nuts'
            ],
            'moderate' => [
                'ass', 'bitch', 'bastard', 'piss', 'shit', 'fuck', 'asshole',
                'dickhead', 'douche', 'retard', 'gay', 'fag', 'slut', 'whore'
            ],
            'severe' => [
                'nigger', 'kike', 'spic', 'chink', 'gook', 'wetback', 'raghead',
                'towelhead', 'sandnigger', 'beaner', 'cracker', 'honkey'
            ],
            'extreme' => [
                // Extremely offensive content, threats, etc.
                'kill yourself', 'kys', 'die', 'suicide', 'rape', 'murder',
                'terrorist', 'bomb', 'attack', 'violence'
            ]
        ];
        
        // Load custom lists from storage
        $customLists = $this->fileStorageService->load('profanity_custom_lists.json') ?? [];
        foreach ($customLists as $severity => $words) {
            if (isset($this->profanityLists[$severity])) {
                $this->profanityLists[$severity] = array_merge($this->profanityLists[$severity], $words);
            }
        }
    }
    
    /**
     * Load whitelist words (false positives)
     */
    private function loadWhitelist() {
        $this->whitelistWords = [
            'class', 'classic', 'glass', 'grass', 'pass', 'mass', 'bass',
            'assess', 'assignment', 'assistance', 'associate', 'assumption',
            'scunthorpe', 'penistone', 'lightwater', 'cockburn', 'sussex'
        ];
        
        // Load custom whitelist
        $customWhitelist = $this->fileStorageService->load('profanity_whitelist.json') ?? [];
        $this->whitelistWords = array_merge($this->whitelistWords, $customWhitelist);
    }
    
    /**
     * Initialize context patterns for advanced detection
     */
    private function initializeContextPatterns() {
        $this->contextPatterns = [
            'threats' => [
                'patterns' => ['/\b(kill|murder|hurt|harm|attack)\s+(you|him|her|them)\b/i'],
                'severity' => 'extreme',
                'score' => 100
            ],
            'harassment' => [
                'patterns' => ['/\b(go\s+die|kys|kill\s+yourself)\b/i'],
                'severity' => 'extreme',
                'score' => 100
            ],
            'hate_speech' => [
                'patterns' => ['/\b(all\s+\w+\s+are\s+(stupid|bad|evil))\b/i'],
                'severity' => 'severe',
                'score' => 75
            ],
            'spam_profanity' => [
                'patterns' => ['/(.)\1{4,}/'], // Repeated characters
                'severity' => 'moderate',
                'score' => 30
            ]
        ];
    }
    
    /**
     * Main filter method - analyze and filter content
     */
    public function filterContent(string $content, array $options = []) {
        if (!$this->filterConfig['enabled']) {
            return [
                'filtered_content' => $content,
                'is_clean' => true,
                'violations' => [],
                'severity_score' => 0,
                'action' => 'allow'
            ];
        }
        
        $result = [
            'original_content' => $content,
            'filtered_content' => $content,
            'is_clean' => true,
            'violations' => [],
            'severity_score' => 0,
            'action' => 'allow',
            'filter_methods_used' => [],
            'context_analysis' => [],
            'suggestions' => []
        ];
        
        // Normalize content for analysis
        $normalizedContent = $this->normalizeContent($content);
        
        // Apply different filtering methods
        if ($this->filterConfig['filter_methods']['exact_match']) {
            $this->applyExactMatch($normalizedContent, $result);
        }
        
        if ($this->filterConfig['filter_methods']['partial_match']) {
            $this->applyPartialMatch($normalizedContent, $result);
        }
        
        if ($this->filterConfig['filter_methods']['leetspeak']) {
            $this->applyLeetspeakDetection($normalizedContent, $result);
        }
        
        if ($this->filterConfig['filter_methods']['phonetic']) {
            $this->applyPhoneticDetection($normalizedContent, $result);
        }
        
        if ($this->filterConfig['filter_methods']['context_analysis']) {
            $this->applyContextAnalysis($normalizedContent, $result);
        }
        
        if ($this->filterConfig['filter_methods']['pattern_detection']) {
            $this->applyPatternDetection($normalizedContent, $result);
        }
        
        // Apply whitelist filtering
        $this->applyWhitelistFiltering($result);
        
        // Determine final action based on severity score
        $this->determineFinalAction($result);
        
        // Apply content replacement if needed
        if ($result['action'] === 'replace') {
            $result['filtered_content'] = $this->applyContentReplacement($content, $result['violations']);
        } elseif ($result['action'] === 'block') {
            $result['filtered_content'] = '';
        }
        
        // Log the filtering result
        $this->logFilteringResult($result, $options);
        
        return $result;
    }
    
    /**
     * Normalize content for analysis
     */
    private function normalizeContent(string $content) {
        // Convert to lowercase
        $normalized = strtolower($content);
        
        // Remove extra spaces
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        
        // Remove special characters that might be used to obfuscate
        $normalized = preg_replace('/[^\w\s]/', '', $normalized);
        
        return trim($normalized);
    }
    
    /**
     * Apply exact word matching
     */
    private function applyExactMatch(string $content, array &$result) {
        $words = explode(' ', $content);
        
        foreach ($this->profanityLists as $severity => $profanityWords) {
            foreach ($profanityWords as $profanityWord) {
                $pattern = '/\b' . preg_quote(strtolower($profanityWord), '/') . '\b/';
                
                if (preg_match($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
                    $violation = [
                        'word' => $profanityWord,
                        'matched_text' => $matches[0][0],
                        'position' => $matches[0][1],
                        'severity' => $severity,
                        'score' => $this->filterConfig['severity_levels'][$severity]['score'],
                        'method' => 'exact_match',
                        'confidence' => 1.0
                    ];
                    
                    $result['violations'][] = $violation;
                    $result['severity_score'] += $violation['score'];
                    $result['is_clean'] = false;
                    $result['filter_methods_used'][] = 'exact_match';
                }
            }
        }
    }
    
    /**
     * Apply partial word matching
     */
    private function applyPartialMatch(string $content, array &$result) {
        if (!$this->filterConfig['allow_partial_words']) {
            return;
        }
        
        foreach ($this->profanityLists as $severity => $profanityWords) {
            foreach ($profanityWords as $profanityWord) {
                if (strlen($profanityWord) < 4) continue; // Skip short words for partial matching
                
                $pattern = '/' . preg_quote(strtolower($profanityWord), '/') . '/';
                
                if (preg_match($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
                    // Check if it's not already caught by exact match
                    $isExactMatch = false;
                    foreach ($result['violations'] as $violation) {
                        if ($violation['method'] === 'exact_match' && $violation['word'] === $profanityWord) {
                            $isExactMatch = true;
                            break;
                        }
                    }
                    
                    if (!$isExactMatch) {
                        $violation = [
                            'word' => $profanityWord,
                            'matched_text' => $matches[0][0],
                            'position' => $matches[0][1],
                            'severity' => $severity,
                            'score' => $this->filterConfig['severity_levels'][$severity]['score'] * 0.7, // Reduced score for partial
                            'method' => 'partial_match',
                            'confidence' => 0.7
                        ];
                        
                        $result['violations'][] = $violation;
                        $result['severity_score'] += $violation['score'];
                        $result['is_clean'] = false;
                        $result['filter_methods_used'][] = 'partial_match';
                    }
                }
            }
        }
    }
    
    /**
     * Apply leetspeak detection (e.g., "f*ck" -> "f4ck", "sh1t")
     */
    private function applyLeetspeakDetection(string $content, array &$result) {
        $leetspeakMap = [
            '4' => 'a', '@' => 'a', '3' => 'e', '1' => 'i', '!' => 'i',
            '0' => 'o', '5' => 's', '$' => 's', '7' => 't', '+' => 't',
            '8' => 'b', '6' => 'g', '9' => 'g', '2' => 'z'
        ];
        
        $decodedContent = strtr($content, $leetspeakMap);
        
        foreach ($this->profanityLists as $severity => $profanityWords) {
            foreach ($profanityWords as $profanityWord) {
                $pattern = '/\b' . preg_quote(strtolower($profanityWord), '/') . '\b/';
                
                if (preg_match($pattern, $decodedContent, $matches, PREG_OFFSET_CAPTURE)) {
                    // Check if it's not already caught by other methods
                    $alreadyCaught = false;
                    foreach ($result['violations'] as $violation) {
                        if ($violation['word'] === $profanityWord) {
                            $alreadyCaught = true;
                            break;
                        }
                    }
                    
                    if (!$alreadyCaught) {
                        $violation = [
                            'word' => $profanityWord,
                            'matched_text' => $matches[0][0],
                            'position' => $matches[0][1],
                            'severity' => $severity,
                            'score' => $this->filterConfig['severity_levels'][$severity]['score'] * 0.8,
                            'method' => 'leetspeak',
                            'confidence' => 0.8
                        ];
                        
                        $result['violations'][] = $violation;
                        $result['severity_score'] += $violation['score'];
                        $result['is_clean'] = false;
                        $result['filter_methods_used'][] = 'leetspeak';
                    }
                }
            }
        }
    }
    
    /**
     * Apply phonetic detection (sounds like)
     */
    private function applyPhoneticDetection(string $content, array &$result) {
        // Simple phonetic patterns
        $phoneticPatterns = [
            'f*ck' => ['fuk', 'fck', 'phuck', 'phuk'],
            'sh*t' => ['sht', 'shyt', 'shiit'],
            'b*tch' => ['bich', 'bytch', 'biatch'],
            'ass' => ['azz', 'asz', 'a55']
        ];
        
        foreach ($phoneticPatterns as $originalWord => $variants) {
            foreach ($variants as $variant) {
                $pattern = '/\b' . preg_quote($variant, '/') . '\b/i';
                
                if (preg_match($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
                    $violation = [
                        'word' => $originalWord,
                        'matched_text' => $matches[0][0],
                        'position' => $matches[0][1],
                        'severity' => 'moderate',
                        'score' => $this->filterConfig['severity_levels']['moderate']['score'] * 0.6,
                        'method' => 'phonetic',
                        'confidence' => 0.6
                    ];
                    
                    $result['violations'][] = $violation;
                    $result['severity_score'] += $violation['score'];
                    $result['is_clean'] = false;
                    $result['filter_methods_used'][] = 'phonetic';
                }
            }
        }
    }
    
    /**
     * Apply context analysis
     */
    private function applyContextAnalysis(string $content, array &$result) {
        foreach ($this->contextPatterns as $patternName => $patternData) {
            foreach ($patternData['patterns'] as $pattern) {
                if (preg_match($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
                    $violation = [
                        'word' => $patternName,
                        'matched_text' => $matches[0][0],
                        'position' => $matches[0][1],
                        'severity' => $patternData['severity'],
                        'score' => $patternData['score'],
                        'method' => 'context_analysis',
                        'confidence' => 0.9,
                        'pattern_type' => $patternName
                    ];
                    
                    $result['violations'][] = $violation;
                    $result['severity_score'] += $violation['score'];
                    $result['is_clean'] = false;
                    $result['filter_methods_used'][] = 'context_analysis';
                    $result['context_analysis'][] = $patternName;
                }
            }
        }
    }
    
    /**
     * Apply pattern detection (repeated chars, caps, etc.)
     */
    private function applyPatternDetection(string $content, array &$result) {
        // Excessive repeated characters
        if (preg_match('/(.)\1{4,}/', $content, $matches)) {
            $violation = [
                'word' => 'repeated_characters',
                'matched_text' => $matches[0],
                'position' => strpos($content, $matches[0]),
                'severity' => 'mild',
                'score' => 5,
                'method' => 'pattern_detection',
                'confidence' => 0.5,
                'pattern_type' => 'repeated_characters'
            ];
            
            $result['violations'][] = $violation;
            $result['severity_score'] += $violation['score'];
            $result['filter_methods_used'][] = 'pattern_detection';
        }
        
        // Excessive caps (more than 70% uppercase)
        $capsRatio = $this->calculateCapsRatio($content);
        if ($capsRatio > 0.7 && strlen($content) > 10) {
            $violation = [
                'word' => 'excessive_caps',
                'matched_text' => $content,
                'position' => 0,
                'severity' => 'mild',
                'score' => 3,
                'method' => 'pattern_detection',
                'confidence' => 0.4,
                'pattern_type' => 'excessive_caps',
                'caps_ratio' => $capsRatio
            ];
            
            $result['violations'][] = $violation;
            $result['severity_score'] += $violation['score'];
            $result['filter_methods_used'][] = 'pattern_detection';
        }
    }
    
    /**
     * Apply whitelist filtering to remove false positives
     */
    private function applyWhitelistFiltering(array &$result) {
        $result['violations'] = array_filter($result['violations'], function($violation) {
            foreach ($this->whitelistWords as $whitelistWord) {
                if (stripos($violation['matched_text'], $whitelistWord) !== false) {
                    return false; // Remove this violation
                }
            }
            return true;
        });
        
        // Recalculate severity score
        $result['severity_score'] = array_sum(array_column($result['violations'], 'score'));
        $result['is_clean'] = empty($result['violations']);
    }
    
    /**
     * Determine final action based on severity score
     */
    private function determineFinalAction(array &$result) {
        if ($result['is_clean']) {
            $result['action'] = 'allow';
            return;
        }
        
        $maxSeverity = 'mild';
        foreach ($result['violations'] as $violation) {
            $severityLevels = ['mild', 'moderate', 'severe', 'extreme'];
            if (array_search($violation['severity'], $severityLevels) > array_search($maxSeverity, $severityLevels)) {
                $maxSeverity = $violation['severity'];
            }
        }
        
        $result['action'] = $this->filterConfig['severity_levels'][$maxSeverity]['action'];
        
        // Override with strict mode
        if ($this->filterConfig['strict_mode'] && !$result['is_clean']) {
            $result['action'] = 'block';
        }
    }
    
    /**
     * Apply content replacement
     */
    private function applyContentReplacement(string $content, array $violations) {
        $replacedContent = $content;
        
        // Sort violations by position (descending) to avoid offset issues
        usort($violations, function($a, $b) {
            return $b['position'] - $a['position'];
        });
        
        foreach ($violations as $violation) {
            $matchedText = $violation['matched_text'];
            $replacement = $this->generateReplacement($matchedText);
            
            $replacedContent = substr_replace(
                $replacedContent,
                $replacement,
                $violation['position'],
                strlen($matchedText)
            );
        }
        
        return $replacedContent;
    }
    
    /**
     * Generate replacement text
     */
    private function generateReplacement(string $originalText) {
        if ($this->filterConfig['replacement_methods']['asterisk']) {
            if ($this->filterConfig['preserve_length']) {
                return str_repeat('*', strlen($originalText));
            } else {
                return '***';
            }
        } elseif ($this->filterConfig['replacement_methods']['emoji']) {
            return '🤬';
        } elseif ($this->filterConfig['replacement_methods']['custom']) {
            return $this->filterConfig['custom_replacement'];
        } elseif ($this->filterConfig['replacement_methods']['remove']) {
            return '';
        }
        
        return str_repeat('*', strlen($originalText));
    }
    
    /**
     * Calculate caps ratio
     */
    private function calculateCapsRatio(string $content) {
        $letters = preg_replace('/[^a-zA-Z]/', '', $content);
        if (strlen($letters) === 0) return 0;
        
        $upperCount = strlen(preg_replace('/[^A-Z]/', '', $letters));
        return $upperCount / strlen($letters);
    }
    
    /**
     * Log filtering result
     */
    private function logFilteringResult(array $result, array $options) {
        if (!$result['is_clean']) {
            $logEntry = [
                'timestamp' => time(),
                'content_length' => strlen($result['original_content']),
                'violations_count' => count($result['violations']),
                'severity_score' => $result['severity_score'],
                'action' => $result['action'],
                'methods_used' => $result['filter_methods_used'],
                'user_id' => $options['user_id'] ?? 'unknown',
                'room_id' => $options['room_id'] ?? 'unknown',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ];
            
            $logFile = "profanity_filter_logs/" . date('Y-m-d') . ".json";
            $existingLogs = $this->fileStorageService->load($logFile) ?? [];
            $existingLogs[] = $logEntry;
            
            $this->fileStorageService->save($logFile, $existingLogs);
        }
    }

    /**
     * Add custom profanity word
     */
    public function addCustomProfanityWord(string $word, string $severity = 'moderate') {
        $customLists = $this->fileStorageService->load('profanity_custom_lists.json') ?? [];

        if (!isset($customLists[$severity])) {
            $customLists[$severity] = [];
        }

        if (!in_array(strtolower($word), $customLists[$severity])) {
            $customLists[$severity][] = strtolower($word);
            $this->fileStorageService->save('profanity_custom_lists.json', $customLists);

            // Reload lists
            $this->loadProfanityLists();

            return true;
        }

        return false;
    }

    /**
     * Remove custom profanity word
     */
    public function removeCustomProfanityWord(string $word, string $severity = null) {
        $customLists = $this->fileStorageService->load('profanity_custom_lists.json') ?? [];
        $removed = false;

        if ($severity) {
            if (isset($customLists[$severity])) {
                $key = array_search(strtolower($word), $customLists[$severity]);
                if ($key !== false) {
                    unset($customLists[$severity][$key]);
                    $customLists[$severity] = array_values($customLists[$severity]);
                    $removed = true;
                }
            }
        } else {
            // Remove from all severities
            foreach ($customLists as $sev => &$words) {
                $key = array_search(strtolower($word), $words);
                if ($key !== false) {
                    unset($words[$key]);
                    $words = array_values($words);
                    $removed = true;
                }
            }
        }

        if ($removed) {
            $this->fileStorageService->save('profanity_custom_lists.json', $customLists);
            $this->loadProfanityLists();
        }

        return $removed;
    }

    /**
     * Add word to whitelist
     */
    public function addWhitelistWord(string $word) {
        $customWhitelist = $this->fileStorageService->load('profanity_whitelist.json') ?? [];

        if (!in_array(strtolower($word), $customWhitelist)) {
            $customWhitelist[] = strtolower($word);
            $this->fileStorageService->save('profanity_whitelist.json', $customWhitelist);

            // Reload whitelist
            $this->loadWhitelist();

            return true;
        }

        return false;
    }

    /**
     * Remove word from whitelist
     */
    public function removeWhitelistWord(string $word) {
        $customWhitelist = $this->fileStorageService->load('profanity_whitelist.json') ?? [];
        $key = array_search(strtolower($word), $customWhitelist);

        if ($key !== false) {
            unset($customWhitelist[$key]);
            $customWhitelist = array_values($customWhitelist);
            $this->fileStorageService->save('profanity_whitelist.json', $customWhitelist);

            // Reload whitelist
            $this->loadWhitelist();

            return true;
        }

        return false;
    }

    /**
     * Update filter configuration
     */
    public function updateFilterConfig(array $newConfig) {
        $this->filterConfig = array_merge($this->filterConfig, $newConfig);

        // Save configuration
        $this->fileStorageService->save('profanity_filter_config.json', $this->filterConfig);

        return true;
    }

    /**
     * Get filter configuration
     */
    public function getFilterConfig() {
        return $this->filterConfig;
    }

    /**
     * Get profanity statistics
     */
    public function getProfanityStatistics(int $days = 7) {
        $stats = [
            'total_filtered' => 0,
            'total_blocked' => 0,
            'total_replaced' => 0,
            'severity_breakdown' => [
                'mild' => 0,
                'moderate' => 0,
                'severe' => 0,
                'extreme' => 0
            ],
            'method_breakdown' => [
                'exact_match' => 0,
                'partial_match' => 0,
                'leetspeak' => 0,
                'phonetic' => 0,
                'context_analysis' => 0,
                'pattern_detection' => 0
            ],
            'top_violations' => [],
            'daily_counts' => []
        ];

        $startTime = time() - ($days * 86400);

        // Analyze log files
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', time() - ($i * 86400));
            $logFile = "profanity_filter_logs/{$date}.json";
            $logs = $this->fileStorageService->load($logFile) ?? [];

            $dailyCount = 0;

            foreach ($logs as $log) {
                if ($log['timestamp'] < $startTime) {
                    continue;
                }

                $stats['total_filtered']++;
                $dailyCount++;

                if ($log['action'] === 'block') {
                    $stats['total_blocked']++;
                } elseif ($log['action'] === 'replace') {
                    $stats['total_replaced']++;
                }

                // Count methods used
                foreach ($log['methods_used'] as $method) {
                    if (isset($stats['method_breakdown'][$method])) {
                        $stats['method_breakdown'][$method]++;
                    }
                }
            }

            $stats['daily_counts'][$date] = $dailyCount;
        }

        return $stats;
    }

    /**
     * Report false positive
     */
    public function reportFalsePositive(string $content, string $userId, string $reason = '') {
        $report = [
            'content' => $content,
            'user_id' => $userId,
            'reason' => $reason,
            'timestamp' => time(),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'status' => 'pending'
        ];

        $reports = $this->fileStorageService->load('profanity_false_positive_reports.json') ?? [];
        $reports[] = $report;

        $this->fileStorageService->save('profanity_false_positive_reports.json', $reports);

        return true;
    }

    /**
     * Get false positive reports
     */
    public function getFalsePositiveReports($status = 'pending') {
        $reports = $this->fileStorageService->load('profanity_false_positive_reports.json') ?? [];

        if ($status) {
            $reports = array_filter($reports, function($report) use ($status) {
                return $report['status'] === $status;
            });
        }

        return $reports;
    }

    /**
     * Process false positive report
     */
    public function processFalsePositiveReport(int $reportIndex, string $action, string $moderatorId) {
        $reports = $this->fileStorageService->load('profanity_false_positive_reports.json') ?? [];

        if (!isset($reports[$reportIndex])) {
            return false;
        }

        $report = &$reports[$reportIndex];
        $report['status'] = $action; // 'approved', 'rejected'
        $report['processed_by'] = $moderatorId;
        $report['processed_at'] = time();

        // If approved, add to whitelist
        if ($action === 'approved') {
            $this->addWhitelistWord($report['content']);
        }

        $this->fileStorageService->save('profanity_false_positive_reports.json', $reports);

        return true;
    }

    /**
     * Bulk filter multiple messages
     */
    public function bulkFilterContent(array $messages, array $options = []) {
        $results = [];

        foreach ($messages as $index => $message) {
            $messageOptions = array_merge($options, ['message_index' => $index]);
            $results[$index] = $this->filterContent($message, $messageOptions);
        }

        return $results;
    }

    /**
     * Test filter with sample content
     */
    public function testFilter(string $content) {
        $originalConfig = $this->filterConfig;

        // Enable all methods for testing
        $this->filterConfig['filter_methods'] = array_fill_keys(
            array_keys($this->filterConfig['filter_methods']),
            true
        );

        $result = $this->filterContent($content, ['test_mode' => true]);

        // Restore original config
        $this->filterConfig = $originalConfig;

        return $result;
    }

    /**
     * Export filter configuration and lists
     */
    public function exportFilterData() {
        return [
            'config' => $this->filterConfig,
            'profanity_lists' => $this->profanityLists,
            'whitelist' => $this->whitelistWords,
            'context_patterns' => $this->contextPatterns,
            'export_timestamp' => time()
        ];
    }

    /**
     * Import filter configuration and lists
     */
    public function importFilterData(array $data) {
        if (isset($data['config'])) {
            $this->filterConfig = $data['config'];
            $this->fileStorageService->save('profanity_filter_config.json', $this->filterConfig);
        }

        if (isset($data['profanity_lists'])) {
            $customLists = [];
            foreach ($data['profanity_lists'] as $severity => $words) {
                $customLists[$severity] = array_diff($words, $this->profanityLists[$severity] ?? []);
            }
            $this->fileStorageService->save('profanity_custom_lists.json', $customLists);
            $this->loadProfanityLists();
        }

        if (isset($data['whitelist'])) {
            $customWhitelist = array_diff($data['whitelist'], $this->whitelistWords);
            $this->fileStorageService->save('profanity_whitelist.json', $customWhitelist);
            $this->loadWhitelist();
        }

        return true;
    }

    /**
     * Clean up old logs
     */
    public function cleanupOldLogs(int $daysToKeep = 30) {
        $cutoffTime = time() - ($daysToKeep * 86400);
        $cleaned = 0;

        // Get all log files
        $logFiles = glob($this->fileStorageService->getStoragePath() . '/profanity_filter_logs/*.json');

        foreach ($logFiles as $file) {
            $date = basename($file, '.json');
            $fileTime = strtotime($date);

            if ($fileTime < $cutoffTime) {
                unlink($file);
                $cleaned++;
            }
        }

        return $cleaned;
    }
}
