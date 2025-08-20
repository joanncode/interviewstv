<?php

namespace App\Services\AI;

class RecommendationEngine
{
    private $pdo;
    private $openaiApiKey;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? '';
    }
    
    /**
     * Get personalized recommendations for user
     */
    public function getRecommendations($userId, $type = 'mixed', $limit = 10)
    {
        $userProfile = $this->buildUserProfile($userId);
        
        switch ($type) {
            case 'interviews':
                return $this->recommendInterviews($userProfile, $limit);
            case 'skills':
                return $this->recommendSkills($userProfile, $limit);
            case 'people':
                return $this->recommendPeople($userProfile, $limit);
            case 'topics':
                return $this->recommendTopics($userProfile, $limit);
            case 'mixed':
            default:
                return $this->getMixedRecommendations($userProfile, $limit);
        }
    }
    
    /**
     * Build comprehensive user profile for recommendations
     */
    private function buildUserProfile($userId)
    {
        $profile = [
            'user_id' => $userId,
            'basic_info' => $this->getUserBasicInfo($userId),
            'skills' => $this->getUserSkills($userId),
            'interests' => $this->getUserInterests($userId),
            'viewing_history' => $this->getViewingHistory($userId),
            'search_history' => $this->getSearchHistory($userId),
            'interaction_patterns' => $this->getInteractionPatterns($userId),
            'performance_data' => $this->getUserPerformanceData($userId),
            'goals' => $this->getUserGoals($userId),
            'preferences' => $this->getUserPreferences($userId)
        ];
        
        return $profile;
    }
    
    /**
     * Recommend interviews based on user profile
     */
    private function recommendInterviews($userProfile, $limit)
    {
        $recommendations = [];
        
        // Content-based filtering
        $contentBased = $this->getContentBasedInterviews($userProfile, $limit * 0.4);
        
        // Collaborative filtering
        $collaborative = $this->getCollaborativeInterviews($userProfile, $limit * 0.3);
        
        // Trending and popular
        $trending = $this->getTrendingInterviews($userProfile, $limit * 0.2);
        
        // AI-powered suggestions
        $aiSuggestions = $this->getAIInterviewSuggestions($userProfile, $limit * 0.1);
        
        // Merge and rank
        $allRecommendations = array_merge($contentBased, $collaborative, $trending, $aiSuggestions);
        $rankedRecommendations = $this->rankRecommendations($allRecommendations, $userProfile);
        
        return array_slice($rankedRecommendations, 0, $limit);
    }
    
    /**
     * Recommend skills to learn
     */
    private function recommendSkills($userProfile, $limit)
    {
        $currentSkills = array_column($userProfile['skills'], 'skill_name');
        
        // Skills based on career goals
        $goalBasedSkills = $this->getGoalBasedSkills($userProfile['goals'], $currentSkills);
        
        // Skills from similar users
        $similarUserSkills = $this->getSkillsFromSimilarUsers($userProfile, $currentSkills);
        
        // Trending skills in user's field
        $trendingSkills = $this->getTrendingSkills($userProfile['interests'], $currentSkills);
        
        // AI-recommended skills
        $aiSkills = $this->getAISkillRecommendations($userProfile, $currentSkills);
        
        $allSkills = array_merge($goalBasedSkills, $similarUserSkills, $trendingSkills, $aiSkills);
        $rankedSkills = $this->rankSkillRecommendations($allSkills, $userProfile);
        
        return array_slice($rankedSkills, 0, $limit);
    }
    
    /**
     * Recommend people to follow or connect with
     */
    private function recommendPeople($userProfile, $limit)
    {
        // People with similar skills
        $skillBasedPeople = $this->getPeopleWithSimilarSkills($userProfile);
        
        // People in similar roles/industries
        $roleBasedPeople = $this->getPeopleInSimilarRoles($userProfile);
        
        // High-performing users
        $topPerformers = $this->getTopPerformers($userProfile['interests']);
        
        // People with complementary skills
        $complementaryPeople = $this->getPeopleWithComplementarySkills($userProfile);
        
        $allPeople = array_merge($skillBasedPeople, $roleBasedPeople, $topPerformers, $complementaryPeople);
        $rankedPeople = $this->rankPeopleRecommendations($allPeople, $userProfile);
        
        return array_slice($rankedPeople, 0, $limit);
    }
    
    /**
     * Recommend topics to explore
     */
    private function recommendTopics($userProfile, $limit)
    {
        // Topics based on current interests
        $relatedTopics = $this->getRelatedTopics($userProfile['interests']);
        
        // Trending topics
        $trendingTopics = $this->getTrendingTopics();
        
        // Topics from skill gaps
        $skillGapTopics = $this->getTopicsForSkillGaps($userProfile);
        
        // AI-suggested topics
        $aiTopics = $this->getAITopicRecommendations($userProfile);
        
        $allTopics = array_merge($relatedTopics, $trendingTopics, $skillGapTopics, $aiTopics);
        $rankedTopics = $this->rankTopicRecommendations($allTopics, $userProfile);
        
        return array_slice($rankedTopics, 0, $limit);
    }
    
    /**
     * Get mixed recommendations
     */
    private function getMixedRecommendations($userProfile, $limit)
    {
        $mixed = [
            'interviews' => $this->recommendInterviews($userProfile, ceil($limit * 0.5)),
            'skills' => $this->recommendSkills($userProfile, ceil($limit * 0.2)),
            'people' => $this->recommendPeople($userProfile, ceil($limit * 0.2)),
            'topics' => $this->recommendTopics($userProfile, ceil($limit * 0.1))
        ];
        
        return $mixed;
    }
    
    /**
     * Content-based interview recommendations
     */
    private function getContentBasedInterviews($userProfile, $limit)
    {
        $userSkills = array_column($userProfile['skills'], 'skill_name');
        $userInterests = $userProfile['interests'];
        
        $sql = "SELECT i.*, u.name as interviewer_name,
                       (CASE WHEN i.category IN ('" . implode("','", $userInterests) . "') THEN 2 ELSE 0 END +
                        CASE WHEN EXISTS (SELECT 1 FROM interview_skills isk WHERE isk.interview_id = i.id AND isk.skill_name IN ('" . implode("','", $userSkills) . "')) THEN 3 ELSE 0 END) as relevance_score
                FROM interviews i
                JOIN users u ON i.user_id = u.id
                WHERE i.status = 'published'
                  AND i.id NOT IN (SELECT interview_id FROM user_views WHERE user_id = ?)
                HAVING relevance_score > 0
                ORDER BY relevance_score DESC, i.created_at DESC
                LIMIT ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userProfile['user_id'], $limit]);
        
        $interviews = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $interviews[] = [
                'type' => 'interview',
                'id' => $row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'category' => $row['category'],
                'interviewer_name' => $row['interviewer_name'],
                'relevance_score' => (float)$row['relevance_score'],
                'recommendation_reason' => $this->getRecommendationReason($row, $userProfile),
                'url' => "/interviews/{$row['id']}"
            ];
        }
        
        return $interviews;
    }
    
    /**
     * Collaborative filtering recommendations
     */
    private function getCollaborativeInterviews($userProfile, $limit)
    {
        // Find similar users based on viewing history and skills
        $similarUsers = $this->findSimilarUsers($userProfile['user_id']);
        
        if (empty($similarUsers)) {
            return [];
        }
        
        $userIds = array_column($similarUsers, 'user_id');
        $placeholders = str_repeat('?,', count($userIds) - 1) . '?';
        
        $sql = "SELECT i.*, u.name as interviewer_name, COUNT(*) as view_count
                FROM interviews i
                JOIN users u ON i.user_id = u.id
                JOIN user_views uv ON i.id = uv.interview_id
                WHERE uv.user_id IN ({$placeholders})
                  AND i.id NOT IN (SELECT interview_id FROM user_views WHERE user_id = ?)
                  AND i.status = 'published'
                GROUP BY i.id
                ORDER BY view_count DESC, i.created_at DESC
                LIMIT ?";
        
        $params = array_merge($userIds, [$userProfile['user_id'], $limit]);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        $interviews = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $interviews[] = [
                'type' => 'interview',
                'id' => $row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'category' => $row['category'],
                'interviewer_name' => $row['interviewer_name'],
                'relevance_score' => (float)$row['view_count'],
                'recommendation_reason' => 'Users with similar interests watched this',
                'url' => "/interviews/{$row['id']}"
            ];
        }
        
        return $interviews;
    }
    
    /**
     * Get AI-powered interview suggestions
     */
    private function getAIInterviewSuggestions($userProfile, $limit)
    {
        $prompt = "Based on this user profile, recommend interview topics that would be most valuable for their learning and career growth:

User Skills: " . implode(', ', array_column($userProfile['skills'], 'skill_name')) . "
User Interests: " . implode(', ', $userProfile['interests']) . "
Career Goals: " . implode(', ', $userProfile['goals']) . "
Experience Level: " . ($userProfile['basic_info']['experience_level'] ?? 'intermediate') . "

Return a JSON array of interview topics with brief explanations of why each would be valuable.";
        
        try {
            $response = $this->callOpenAI($prompt);
            $suggestions = json_decode($response, true);
            
            if (is_array($suggestions)) {
                return array_slice($suggestions, 0, $limit);
            }
        } catch (\Exception $e) {
            // Fallback to empty array
        }
        
        return [];
    }
    
    /**
     * Find users with similar profiles
     */
    private function findSimilarUsers($userId)
    {
        $sql = "SELECT u2.id as user_id, 
                       COUNT(DISTINCT s1.skill_name) as common_skills,
                       COUNT(DISTINCT v1.interview_id) as common_views
                FROM users u1
                JOIN user_skills s1 ON u1.id = s1.user_id
                JOIN user_skills s2 ON s1.skill_name = s2.skill_name
                JOIN users u2 ON s2.user_id = u2.id
                LEFT JOIN user_views v1 ON u1.id = v1.user_id
                LEFT JOIN user_views v2 ON u2.id = v2.user_id AND v1.interview_id = v2.interview_id
                WHERE u1.id = ? AND u2.id != ?
                GROUP BY u2.id
                HAVING common_skills >= 2
                ORDER BY common_skills DESC, common_views DESC
                LIMIT 10";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $userId]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    /**
     * Rank recommendations based on multiple factors
     */
    private function rankRecommendations($recommendations, $userProfile)
    {
        foreach ($recommendations as &$rec) {
            $score = $rec['relevance_score'] ?? 0;
            
            // Boost based on user preferences
            $score += $this->calculatePreferenceBoost($rec, $userProfile);
            
            // Boost based on recency
            $score += $this->calculateRecencyBoost($rec);
            
            // Boost based on quality metrics
            $score += $this->calculateQualityBoost($rec);
            
            $rec['final_score'] = $score;
        }
        
        usort($recommendations, function($a, $b) {
            return $b['final_score'] <=> $a['final_score'];
        });
        
        return $recommendations;
    }
    
    /**
     * Get recommendation reason
     */
    private function getRecommendationReason($item, $userProfile)
    {
        $reasons = [];
        
        if (in_array($item['category'], $userProfile['interests'])) {
            $reasons[] = "matches your interest in {$item['category']}";
        }
        
        // Check for skill matches
        $userSkills = array_column($userProfile['skills'], 'skill_name');
        $itemSkills = $this->getInterviewSkills($item['id']);
        $commonSkills = array_intersect($userSkills, $itemSkills);
        
        if (!empty($commonSkills)) {
            $reasons[] = "covers " . implode(', ', array_slice($commonSkills, 0, 2));
        }
        
        if (empty($reasons)) {
            $reasons[] = "recommended for you";
        }
        
        return implode(' and ', $reasons);
    }
    
    /**
     * Call OpenAI API
     */
    private function callOpenAI($prompt)
    {
        $curl = curl_init();
        
        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert career advisor and learning recommendation system. Provide helpful, personalized recommendations.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'temperature' => 0.7,
            'max_tokens' => 800
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
    
    // Helper methods (simplified implementations)
    private function getUserBasicInfo($userId) { return []; }
    private function getUserSkills($userId) { return []; }
    private function getUserInterests($userId) { return []; }
    private function getViewingHistory($userId) { return []; }
    private function getSearchHistory($userId) { return []; }
    private function getInteractionPatterns($userId) { return []; }
    private function getUserPerformanceData($userId) { return []; }
    private function getUserGoals($userId) { return []; }
    private function getUserPreferences($userId) { return []; }
    private function getTrendingInterviews($userProfile, $limit) { return []; }
    private function getGoalBasedSkills($goals, $currentSkills) { return []; }
    private function getSkillsFromSimilarUsers($userProfile, $currentSkills) { return []; }
    private function getTrendingSkills($interests, $currentSkills) { return []; }
    private function getAISkillRecommendations($userProfile, $currentSkills) { return []; }
    private function rankSkillRecommendations($skills, $userProfile) { return $skills; }
    private function getPeopleWithSimilarSkills($userProfile) { return []; }
    private function getPeopleInSimilarRoles($userProfile) { return []; }
    private function getTopPerformers($interests) { return []; }
    private function getPeopleWithComplementarySkills($userProfile) { return []; }
    private function rankPeopleRecommendations($people, $userProfile) { return $people; }
    private function getRelatedTopics($interests) { return []; }
    private function getTrendingTopics() { return []; }
    private function getTopicsForSkillGaps($userProfile) { return []; }
    private function getAITopicRecommendations($userProfile) { return []; }
    private function rankTopicRecommendations($topics, $userProfile) { return $topics; }
    private function calculatePreferenceBoost($rec, $userProfile) { return 0; }
    private function calculateRecencyBoost($rec) { return 0; }
    private function calculateQualityBoost($rec) { return 0; }
    private function getInterviewSkills($interviewId) { return []; }
}
