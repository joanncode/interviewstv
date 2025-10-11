<?php

namespace App\Services\AI;

class SmartSearchService
{
    private $pdo;
    private $openaiApiKey;
    private $elasticsearchClient;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? '';
        $this->elasticsearchClient = $this->initializeElasticsearch();
    }
    
    /**
     * Perform intelligent search with AI enhancement
     */
    public function search($query, $filters = [], $userId = null, $options = [])
    {
        // Analyze search intent
        $searchIntent = $this->analyzeSearchIntent($query);
        
        // Enhance query with AI
        $enhancedQuery = $this->enhanceQuery($query, $searchIntent);
        
        // Perform multi-modal search
        $results = [
            'interviews' => $this->searchInterviews($enhancedQuery, $filters, $options),
            'users' => $this->searchUsers($enhancedQuery, $filters, $options),
            'topics' => $this->searchTopics($enhancedQuery, $options),
            'skills' => $this->searchSkills($enhancedQuery, $options)
        ];
        
        // Apply personalization if user is provided
        if ($userId) {
            $results = $this->personalizeResults($results, $userId, $searchIntent);
        }
        
        // Rank and merge results
        $rankedResults = $this->rankResults($results, $query, $searchIntent);
        
        // Track search for analytics
        $this->trackSearch($query, $userId, $searchIntent, count($rankedResults));
        
        return [
            'query' => $query,
            'intent' => $searchIntent,
            'enhanced_query' => $enhancedQuery,
            'results' => $rankedResults,
            'total_results' => count($rankedResults),
            'search_time' => microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true)),
            'suggestions' => $this->generateSearchSuggestions($query, $searchIntent)
        ];
    }
    
    /**
     * Analyze search intent using AI
     */
    private function analyzeSearchIntent($query)
    {
        $prompt = "Analyze this search query and determine the user's intent. Return a JSON object with the following fields:
- primary_intent: one of [find_interview, find_person, learn_skill, explore_topic, get_advice]
- secondary_intents: array of additional intents
- entities: array of entities mentioned (people, companies, technologies, skills)
- difficulty_level: one of [beginner, intermediate, advanced, any]
- content_type: one of [video, text, both]
- urgency: one of [low, medium, high]

Query: \"{$query}\"";
        
        try {
            $response = $this->callOpenAI($prompt, 0.3);
            $intent = json_decode($response, true);
            
            if (!$intent) {
                // Fallback to basic intent analysis
                $intent = $this->basicIntentAnalysis($query);
            }
            
            return $intent;
            
        } catch (\Exception $e) {
            return $this->basicIntentAnalysis($query);
        }
    }
    
    /**
     * Enhance query with AI-powered expansion
     */
    private function enhanceQuery($query, $intent)
    {
        $prompt = "Enhance this search query by adding relevant synonyms, related terms, and context. 
Keep the original meaning but expand with terms that would help find relevant content.
Return only the enhanced query text, no explanations.

Original query: \"{$query}\"
Intent: {$intent['primary_intent']}
Entities: " . implode(', ', $intent['entities'] ?? []);
        
        try {
            $enhanced = $this->callOpenAI($prompt, 0.5);
            return trim($enhanced, '"');
        } catch (\Exception $e) {
            return $query; // Fallback to original query
        }
    }
    
    /**
     * Search interviews with advanced filtering
     */
    private function searchInterviews($query, $filters, $options)
    {
        $searchParams = [
            'index' => 'interviews',
            'body' => [
                'query' => [
                    'bool' => [
                        'must' => [
                            [
                                'multi_match' => [
                                    'query' => $query,
                                    'fields' => [
                                        'title^3',
                                        'description^2',
                                        'transcription',
                                        'tags^2',
                                        'category',
                                        'user.name'
                                    ],
                                    'type' => 'best_fields',
                                    'fuzziness' => 'AUTO'
                                ]
                            ]
                        ],
                        'filter' => $this->buildFilters($filters),
                        'should' => [
                            [
                                'match' => [
                                    'ai_keywords' => [
                                        'query' => $query,
                                        'boost' => 1.5
                                    ]
                                ]
                            ]
                        ]
                    ]
                ],
                'highlight' => [
                    'fields' => [
                        'title' => new \stdClass(),
                        'description' => new \stdClass(),
                        'transcription' => [
                            'fragment_size' => 150,
                            'number_of_fragments' => 3
                        ]
                    ]
                ],
                'sort' => $this->buildSort($options),
                'size' => $options['limit'] ?? 20,
                'from' => ($options['page'] ?? 1 - 1) * ($options['limit'] ?? 20)
            ]
        ];
        
        try {
            $response = $this->elasticsearchClient->search($searchParams);
            return $this->formatElasticsearchResults($response, 'interview');
        } catch (\Exception $e) {
            // Fallback to database search
            return $this->fallbackInterviewSearch($query, $filters, $options);
        }
    }
    
    /**
     * Search users with skill matching
     */
    private function searchUsers($query, $filters, $options)
    {
        $sql = "SELECT u.*, 
                       GROUP_CONCAT(DISTINCT s.skill_name) as skills,
                       COUNT(DISTINCT i.id) as interview_count,
                       AVG(ia.overall_score) as avg_score,
                       MATCH(u.name, u.bio) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM users u
                LEFT JOIN user_skills s ON u.id = s.user_id
                LEFT JOIN interviews i ON u.id = i.user_id
                LEFT JOIN interview_analysis ia ON i.id = ia.interview_id
                WHERE (MATCH(u.name, u.bio) AGAINST(? IN NATURAL LANGUAGE MODE)
                       OR u.name LIKE ?
                       OR EXISTS (SELECT 1 FROM user_skills us WHERE us.user_id = u.id AND us.skill_name LIKE ?))
                GROUP BY u.id
                HAVING relevance_score > 0 OR u.name LIKE ? OR skills LIKE ?
                ORDER BY relevance_score DESC, avg_score DESC
                LIMIT ?";
        
        $searchTerm = '%' . $query . '%';
        $limit = $options['limit'] ?? 10;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$query, $query, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $limit]);
        
        $users = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $users[] = [
                'type' => 'user',
                'id' => $row['id'],
                'name' => $row['name'],
                'bio' => $row['bio'],
                'skills' => $row['skills'] ? explode(',', $row['skills']) : [],
                'interview_count' => (int)$row['interview_count'],
                'avg_score' => $row['avg_score'] ? round($row['avg_score'], 1) : null,
                'relevance_score' => (float)$row['relevance_score'],
                'profile_url' => "/users/{$row['id']}"
            ];
        }
        
        return $users;
    }
    
    /**
     * Search topics and categories
     */
    private function searchTopics($query, $options)
    {
        $sql = "SELECT 
                    category as name,
                    COUNT(*) as interview_count,
                    AVG(ia.overall_score) as avg_score,
                    GROUP_CONCAT(DISTINCT tags) as related_tags
                FROM interviews i
                LEFT JOIN interview_analysis ia ON i.id = ia.interview_id
                WHERE category LIKE ? OR tags LIKE ?
                GROUP BY category
                ORDER BY interview_count DESC
                LIMIT ?";
        
        $searchTerm = '%' . $query . '%';
        $limit = $options['limit'] ?? 5;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm, $limit]);
        
        $topics = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $topics[] = [
                'type' => 'topic',
                'name' => $row['name'],
                'interview_count' => (int)$row['interview_count'],
                'avg_score' => $row['avg_score'] ? round($row['avg_score'], 1) : null,
                'related_tags' => $row['related_tags'] ? explode(',', $row['related_tags']) : [],
                'url' => "/topics/" . urlencode($row['name'])
            ];
        }
        
        return $topics;
    }
    
    /**
     * Search skills with demand analysis
     */
    private function searchSkills($query, $options)
    {
        $sql = "SELECT 
                    skill_name as name,
                    COUNT(DISTINCT us.user_id) as user_count,
                    COUNT(DISTINCT i.id) as interview_count,
                    AVG(ia.overall_score) as avg_score
                FROM user_skills us
                LEFT JOIN interviews i ON us.user_id = i.user_id
                LEFT JOIN interview_analysis ia ON i.id = ia.interview_id
                WHERE skill_name LIKE ?
                GROUP BY skill_name
                ORDER BY user_count DESC, interview_count DESC
                LIMIT ?";
        
        $searchTerm = '%' . $query . '%';
        $limit = $options['limit'] ?? 5;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$searchTerm, $limit]);
        
        $skills = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $skills[] = [
                'type' => 'skill',
                'name' => $row['name'],
                'user_count' => (int)$row['user_count'],
                'interview_count' => (int)$row['interview_count'],
                'avg_score' => $row['avg_score'] ? round($row['avg_score'], 1) : null,
                'demand_level' => $this->calculateSkillDemand($row),
                'url' => "/skills/" . urlencode($row['name'])
            ];
        }
        
        return $skills;
    }
    
    /**
     * Personalize search results based on user preferences
     */
    private function personalizeResults($results, $userId, $intent)
    {
        $userProfile = $this->getUserProfile($userId);
        $userPreferences = $this->getUserPreferences($userId);
        
        foreach ($results as $type => &$items) {
            foreach ($items as &$item) {
                // Boost relevance based on user interests
                $personalizedScore = $this->calculatePersonalizedScore($item, $userProfile, $userPreferences);
                $item['personalized_score'] = $personalizedScore;
                $item['relevance_boost'] = $personalizedScore - ($item['relevance_score'] ?? 0);
            }
            
            // Re-sort by personalized score
            usort($items, function($a, $b) {
                return $b['personalized_score'] <=> $a['personalized_score'];
            });
        }
        
        return $results;
    }
    
    /**
     * Rank and merge results from different sources
     */
    private function rankResults($results, $query, $intent)
    {
        $merged = [];
        
        // Weight different result types based on intent
        $weights = $this->getResultTypeWeights($intent['primary_intent']);
        
        foreach ($results as $type => $items) {
            foreach ($items as $item) {
                $item['final_score'] = ($item['personalized_score'] ?? $item['relevance_score'] ?? 0) * $weights[$type];
                $merged[] = $item;
            }
        }
        
        // Sort by final score
        usort($merged, function($a, $b) {
            return $b['final_score'] <=> $a['final_score'];
        });
        
        return array_slice($merged, 0, 50); // Limit to top 50 results
    }
    
    /**
     * Generate search suggestions
     */
    private function generateSearchSuggestions($query, $intent)
    {
        $suggestions = [];
        
        // Related queries from search history
        $relatedQueries = $this->getRelatedQueries($query);
        
        // AI-generated suggestions
        $aiSuggestions = $this->generateAISuggestions($query, $intent);
        
        // Popular searches in same category
        $popularSearches = $this->getPopularSearches($intent['primary_intent']);
        
        return [
            'related_queries' => $relatedQueries,
            'ai_suggestions' => $aiSuggestions,
            'popular_searches' => $popularSearches,
            'autocomplete' => $this->getAutocompleteSuggestions($query)
        ];
    }
    
    /**
     * Basic intent analysis fallback
     */
    private function basicIntentAnalysis($query)
    {
        $query = strtolower($query);
        
        $intent = [
            'primary_intent' => 'find_interview',
            'secondary_intents' => [],
            'entities' => [],
            'difficulty_level' => 'any',
            'content_type' => 'both',
            'urgency' => 'medium'
        ];
        
        // Simple keyword-based intent detection
        if (preg_match('/\b(learn|tutorial|how to|guide)\b/', $query)) {
            $intent['primary_intent'] = 'learn_skill';
        } elseif (preg_match('/\b(person|people|expert|developer)\b/', $query)) {
            $intent['primary_intent'] = 'find_person';
        } elseif (preg_match('/\b(topic|about|discuss)\b/', $query)) {
            $intent['primary_intent'] = 'explore_topic';
        }
        
        // Extract potential entities
        $techTerms = ['javascript', 'python', 'react', 'node', 'java', 'php', 'css', 'html'];
        foreach ($techTerms as $term) {
            if (strpos($query, $term) !== false) {
                $intent['entities'][] = $term;
            }
        }
        
        return $intent;
    }
    
    /**
     * Call OpenAI API
     */
    private function callOpenAI($prompt, $temperature = 0.7)
    {
        $curl = curl_init();
        
        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert search assistant. Provide accurate, helpful responses in the requested format.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'temperature' => $temperature,
            'max_tokens' => 500
        ];
        
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->openaiApiKey,
            ],
            CURLOPT_TIMEOUT => 30,
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($httpCode !== 200) {
            throw new \Exception('OpenAI API error: HTTP ' . $httpCode);
        }
        
        $result = json_decode($response, true);
        
        if (!isset($result['choices'][0]['message']['content'])) {
            throw new \Exception('Invalid OpenAI API response');
        }
        
        return $result['choices'][0]['message']['content'];
    }
    
    // Additional helper methods would be implemented here...
    private function initializeElasticsearch() { return null; } // Placeholder
    private function buildFilters($filters) { return []; }
    private function buildSort($options) { return ['_score' => ['order' => 'desc']]; }
    private function formatElasticsearchResults($response, $type) { return []; }
    private function fallbackInterviewSearch($query, $filters, $options) { return []; }
    private function calculateSkillDemand($row) { return 'medium'; }
    private function getUserProfile($userId) { return []; }
    private function getUserPreferences($userId) { return []; }
    private function calculatePersonalizedScore($item, $profile, $preferences) { return 0.5; }
    private function getResultTypeWeights($intent) { 
        return ['interviews' => 1.0, 'users' => 0.8, 'topics' => 0.6, 'skills' => 0.4]; 
    }
    private function getRelatedQueries($query) { return []; }
    private function generateAISuggestions($query, $intent) { return []; }
    private function getPopularSearches($intent) { return []; }
    private function getAutocompleteSuggestions($query) { return []; }
    private function trackSearch($query, $userId, $intent, $resultCount) { }
}
