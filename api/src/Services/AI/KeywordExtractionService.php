<?php

namespace App\Services\AI;

class KeywordExtractionService
{
    private $openaiApiKey;
    private $model = 'gpt-3.5-turbo';
    private $stopWords;
    
    public function __construct()
    {
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? '';
        $this->stopWords = $this->getStopWords();
    }
    
    /**
     * Extract keywords from interview text
     */
    public function extractKeywords($text, $maxKeywords = 20)
    {
        $keywords = [
            'technical_terms' => $this->extractTechnicalTerms($text),
            'soft_skills' => $this->extractSoftSkills($text),
            'industry_terms' => $this->extractIndustryTerms($text),
            'action_words' => $this->extractActionWords($text),
            'experience_indicators' => $this->extractExperienceIndicators($text),
            'all_keywords' => []
        ];
        
        // Combine and rank all keywords
        $allKeywords = array_merge(
            $keywords['technical_terms'],
            $keywords['soft_skills'],
            $keywords['industry_terms'],
            $keywords['action_words'],
            $keywords['experience_indicators']
        );
        
        $keywords['all_keywords'] = $this->rankKeywords($allKeywords, $text, $maxKeywords);
        
        return $keywords;
    }
    
    /**
     * Extract technical terms and technologies
     */
    private function extractTechnicalTerms($text)
    {
        $prompt = "Extract technical terms, programming languages, frameworks, tools, and technologies mentioned in this interview transcript. Return as a JSON array of strings.

Text: " . substr($text, 0, 4000);
        
        $response = $this->callOpenAI($prompt);
        $terms = json_decode($response, true);
        
        if (!is_array($terms)) {
            $terms = $this->fallbackTechnicalExtraction($text);
        }
        
        return array_slice($terms, 0, 15);
    }
    
    /**
     * Extract soft skills mentioned
     */
    private function extractSoftSkills($text)
    {
        $prompt = "Extract soft skills and personal qualities mentioned in this interview transcript. Look for communication skills, leadership, teamwork, problem-solving, etc. Return as a JSON array of strings.

Text: " . substr($text, 0, 4000);
        
        $response = $this->callOpenAI($prompt);
        $skills = json_decode($response, true);
        
        if (!is_array($skills)) {
            $skills = $this->fallbackSoftSkillsExtraction($text);
        }
        
        return array_slice($skills, 0, 10);
    }
    
    /**
     * Extract industry-specific terms
     */
    private function extractIndustryTerms($text)
    {
        $prompt = "Extract industry-specific terms, business concepts, and domain knowledge mentioned in this interview transcript. Return as a JSON array of strings.

Text: " . substr($text, 0, 4000);
        
        $response = $this->callOpenAI($prompt);
        $terms = json_decode($response, true);
        
        if (!is_array($terms)) {
            $terms = $this->fallbackIndustryExtraction($text);
        }
        
        return array_slice($terms, 0, 10);
    }
    
    /**
     * Extract action words and achievements
     */
    private function extractActionWords($text)
    {
        $actionWords = [
            'developed', 'created', 'built', 'designed', 'implemented', 'managed', 'led',
            'improved', 'optimized', 'solved', 'analyzed', 'collaborated', 'delivered',
            'achieved', 'increased', 'reduced', 'streamlined', 'automated', 'launched'
        ];
        
        $foundActions = [];
        $text = strtolower($text);
        
        foreach ($actionWords as $action) {
            if (strpos($text, $action) !== false) {
                $foundActions[] = $action;
            }
        }
        
        return array_unique($foundActions);
    }
    
    /**
     * Extract experience indicators
     */
    private function extractExperienceIndicators($text)
    {
        $indicators = [];
        
        // Look for years of experience
        if (preg_match_all('/(\d+)\s*(years?|months?)\s*(of\s*)?(experience|working|in)/i', $text, $matches)) {
            foreach ($matches[0] as $match) {
                $indicators[] = trim($match);
            }
        }
        
        // Look for project mentions
        if (preg_match_all('/(project|projects)\s*(I|we)\s*(worked|built|developed|created)/i', $text, $matches)) {
            $indicators[] = 'project experience';
        }
        
        // Look for team size mentions
        if (preg_match_all('/(team|teams)\s*of\s*(\d+)/i', $text, $matches)) {
            foreach ($matches[0] as $match) {
                $indicators[] = trim($match);
            }
        }
        
        return array_unique($indicators);
    }
    
    /**
     * Extract topics and themes from text
     */
    public function extractTopics($text, $maxTopics = 10)
    {
        $prompt = "Identify the main topics and themes discussed in this interview transcript. Return as a JSON array of objects with 'topic' and 'relevance_score' (0-1) fields.

Text: " . substr($text, 0, 4000);
        
        $response = $this->callOpenAI($prompt);
        $topics = json_decode($response, true);
        
        if (!is_array($topics)) {
            $topics = $this->fallbackTopicExtraction($text);
        }
        
        // Sort by relevance score
        usort($topics, function($a, $b) {
            return ($b['relevance_score'] ?? 0) <=> ($a['relevance_score'] ?? 0);
        });
        
        return array_slice($topics, 0, $maxTopics);
    }
    
    /**
     * Rank keywords by importance
     */
    private function rankKeywords($keywords, $text, $maxKeywords)
    {
        $keywordScores = [];
        $text = strtolower($text);
        $totalWords = str_word_count($text);
        
        foreach ($keywords as $keyword) {
            $keyword = strtolower($keyword);
            $frequency = substr_count($text, $keyword);
            $length = strlen($keyword);
            
            // Calculate TF-IDF-like score
            $tf = $frequency / $totalWords;
            $lengthBonus = min($length / 10, 1); // Longer terms get bonus
            $score = $tf * (1 + $lengthBonus);
            
            $keywordScores[$keyword] = $score;
        }
        
        // Sort by score
        arsort($keywordScores);
        
        return array_slice(array_keys($keywordScores), 0, $maxKeywords);
    }
    
    /**
     * Analyze keyword context and relationships
     */
    public function analyzeKeywordContext($text, $keywords)
    {
        $context = [];
        
        foreach ($keywords as $keyword) {
            $context[$keyword] = [
                'frequency' => substr_count(strtolower($text), strtolower($keyword)),
                'contexts' => $this->findKeywordContexts($text, $keyword),
                'related_terms' => $this->findRelatedTerms($text, $keyword)
            ];
        }
        
        return $context;
    }
    
    /**
     * Find contexts where keyword appears
     */
    private function findKeywordContexts($text, $keyword)
    {
        $contexts = [];
        $keyword = preg_quote($keyword, '/');
        
        if (preg_match_all('/(.{0,50})' . $keyword . '(.{0,50})/i', $text, $matches)) {
            foreach ($matches[0] as $match) {
                $contexts[] = trim($match);
            }
        }
        
        return array_slice($contexts, 0, 3); // Limit to 3 contexts
    }
    
    /**
     * Find terms related to keyword
     */
    private function findRelatedTerms($text, $keyword)
    {
        // Simple co-occurrence analysis
        $relatedTerms = [];
        $sentences = preg_split('/[.!?]+/', $text);
        
        foreach ($sentences as $sentence) {
            if (stripos($sentence, $keyword) !== false) {
                $words = str_word_count(strtolower($sentence), 1);
                foreach ($words as $word) {
                    if (strlen($word) > 3 && !in_array($word, $this->stopWords) && $word !== strtolower($keyword)) {
                        $relatedTerms[] = $word;
                    }
                }
            }
        }
        
        $termCounts = array_count_values($relatedTerms);
        arsort($termCounts);
        
        return array_slice(array_keys($termCounts), 0, 5);
    }
    
    /**
     * Call OpenAI API
     */
    private function callOpenAI($prompt)
    {
        $curl = curl_init();
        
        $data = [
            'model' => $this->model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert in natural language processing and keyword extraction. Provide accurate, relevant results in the requested JSON format.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'temperature' => 0.3,
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
            CURLOPT_TIMEOUT => 60,
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
    
    /**
     * Fallback technical term extraction
     */
    private function fallbackTechnicalExtraction($text)
    {
        $technicalTerms = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'express',
            'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
            'git', 'github', 'api', 'rest', 'graphql', 'microservices', 'devops', 'ci/cd'
        ];
        
        $found = [];
        $text = strtolower($text);
        
        foreach ($technicalTerms as $term) {
            if (strpos($text, $term) !== false) {
                $found[] = $term;
            }
        }
        
        return $found;
    }
    
    /**
     * Fallback soft skills extraction
     */
    private function fallbackSoftSkillsExtraction($text)
    {
        $softSkills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
            'creative', 'adaptable', 'organized', 'detail-oriented', 'collaborative'
        ];
        
        $found = [];
        $text = strtolower($text);
        
        foreach ($softSkills as $skill) {
            if (strpos($text, $skill) !== false) {
                $found[] = $skill;
            }
        }
        
        return $found;
    }
    
    /**
     * Fallback industry term extraction
     */
    private function fallbackIndustryExtraction($text)
    {
        $industryTerms = [
            'agile', 'scrum', 'kanban', 'sprint', 'stakeholder', 'requirements',
            'architecture', 'scalability', 'performance', 'security', 'testing'
        ];
        
        $found = [];
        $text = strtolower($text);
        
        foreach ($industryTerms as $term) {
            if (strpos($text, $term) !== false) {
                $found[] = $term;
            }
        }
        
        return $found;
    }
    
    /**
     * Fallback topic extraction
     */
    private function fallbackTopicExtraction($text)
    {
        return [
            ['topic' => 'Technical Skills', 'relevance_score' => 0.8],
            ['topic' => 'Experience', 'relevance_score' => 0.7],
            ['topic' => 'Problem Solving', 'relevance_score' => 0.6],
            ['topic' => 'Communication', 'relevance_score' => 0.5]
        ];
    }
    
    /**
     * Get common stop words
     */
    private function getStopWords()
    {
        return [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ];
    }
}
