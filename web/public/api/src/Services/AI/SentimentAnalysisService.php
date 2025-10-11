<?php

namespace App\Services\AI;

class SentimentAnalysisService
{
    private $openaiApiKey;
    private $model = 'gpt-3.5-turbo';
    
    public function __construct()
    {
        $this->openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? '';
    }
    
    /**
     * Analyze sentiment of interview text
     */
    public function analyzeSentiment($text)
    {
        $analysis = [
            'overall_sentiment' => $this->getOverallSentiment($text),
            'confidence_score' => $this->analyzeConfidence($text),
            'emotions' => $this->analyzeEmotions($text),
            'sentiment_timeline' => $this->analyzeSentimentTimeline($text),
            'key_phrases' => $this->extractKeyPhrases($text),
            'tone_analysis' => $this->analyzeTone($text)
        ];
        
        return $analysis;
    }
    
    /**
     * Get overall sentiment using OpenAI
     */
    private function getOverallSentiment($text)
    {
        $prompt = "Analyze the sentiment of this interview transcript and return a score between -1 (very negative) and 1 (very positive). Consider the overall tone, confidence, and emotional state of the speaker. Return only a decimal number.

Text: " . substr($text, 0, 4000); // Limit text length
        
        $response = $this->callOpenAI($prompt, 0.3);
        
        // Parse the response to get a numeric score
        $score = floatval(trim($response));
        return max(-1, min(1, $score)); // Ensure score is between -1 and 1
    }
    
    /**
     * Analyze confidence level in speech
     */
    private function analyzeConfidence($text)
    {
        $prompt = "Analyze the confidence level in this interview transcript. Look for indicators like:
- Certainty in responses
- Use of definitive language vs. uncertain language
- Hesitation markers
- Self-assurance

Return a confidence score between 0 (very uncertain) and 1 (very confident). Return only a decimal number.

Text: " . substr($text, 0, 4000);
        
        $response = $this->callOpenAI($prompt, 0.3);
        
        $score = floatval(trim($response));
        return max(0, min(1, $score));
    }
    
    /**
     * Analyze specific emotions
     */
    private function analyzeEmotions($text)
    {
        $prompt = "Analyze the emotions present in this interview transcript. Rate each emotion from 0 to 1:

Return a JSON object with these emotions:
- joy
- enthusiasm
- nervousness
- frustration
- excitement
- anxiety
- determination
- satisfaction

Text: " . substr($text, 0, 3000);
        
        $response = $this->callOpenAI($prompt, 0.5);
        
        // Try to parse JSON response
        $emotions = json_decode($response, true);
        
        if (!$emotions) {
            // Fallback to default values
            $emotions = [
                'joy' => 0.5,
                'enthusiasm' => 0.5,
                'nervousness' => 0.3,
                'frustration' => 0.2,
                'excitement' => 0.4,
                'anxiety' => 0.3,
                'determination' => 0.6,
                'satisfaction' => 0.5
            ];
        }
        
        return $emotions;
    }
    
    /**
     * Analyze sentiment changes over time
     */
    private function analyzeSentimentTimeline($text)
    {
        // Split text into segments for timeline analysis
        $segments = $this->splitTextIntoSegments($text, 5); // 5 segments
        $timeline = [];
        
        foreach ($segments as $index => $segment) {
            $sentiment = $this->getSegmentSentiment($segment);
            $timeline[] = [
                'segment' => $index + 1,
                'sentiment' => $sentiment,
                'text_preview' => substr($segment, 0, 100) . '...'
            ];
        }
        
        return $timeline;
    }
    
    /**
     * Extract key emotional phrases
     */
    private function extractKeyPhrases($text)
    {
        $prompt = "Extract key phrases from this interview transcript that indicate emotional state, confidence level, or attitude. Return up to 10 phrases as a JSON array.

Text: " . substr($text, 0, 3000);
        
        $response = $this->callOpenAI($prompt, 0.7);
        
        $phrases = json_decode($response, true);
        
        if (!$phrases || !is_array($phrases)) {
            // Fallback to basic phrase extraction
            $phrases = $this->basicPhraseExtraction($text);
        }
        
        return $phrases;
    }
    
    /**
     * Analyze tone characteristics
     */
    private function analyzeTone($text)
    {
        $prompt = "Analyze the tone of this interview transcript. Rate each characteristic from 0 to 1 and return as JSON:

{
  \"professional\": 0.8,
  \"casual\": 0.3,
  \"enthusiastic\": 0.7,
  \"nervous\": 0.2,
  \"confident\": 0.8,
  \"friendly\": 0.6,
  \"formal\": 0.7,
  \"assertive\": 0.5
}

Text: " . substr($text, 0, 3000);
        
        $response = $this->callOpenAI($prompt, 0.5);
        
        $tone = json_decode($response, true);
        
        if (!$tone) {
            $tone = [
                'professional' => 0.7,
                'casual' => 0.4,
                'enthusiastic' => 0.5,
                'nervous' => 0.3,
                'confident' => 0.6,
                'friendly' => 0.6,
                'formal' => 0.6,
                'assertive' => 0.5
            ];
        }
        
        return $tone;
    }
    
    /**
     * Call OpenAI API
     */
    private function callOpenAI($prompt, $temperature = 0.7)
    {
        $curl = curl_init();
        
        $data = [
            'model' => $this->model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert in sentiment analysis and emotional intelligence. Provide accurate, objective analysis.'
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
     * Split text into segments for timeline analysis
     */
    private function splitTextIntoSegments($text, $numSegments)
    {
        $textLength = strlen($text);
        $segmentLength = intval($textLength / $numSegments);
        $segments = [];
        
        for ($i = 0; $i < $numSegments; $i++) {
            $start = $i * $segmentLength;
            $length = ($i === $numSegments - 1) ? $textLength - $start : $segmentLength;
            $segments[] = substr($text, $start, $length);
        }
        
        return $segments;
    }
    
    /**
     * Get sentiment for a text segment
     */
    private function getSegmentSentiment($segment)
    {
        // Use a simpler approach for segments to avoid too many API calls
        $positiveWords = ['great', 'excellent', 'good', 'positive', 'confident', 'excited', 'happy', 'successful'];
        $negativeWords = ['bad', 'terrible', 'difficult', 'problem', 'issue', 'worried', 'nervous', 'failed'];
        
        $text = strtolower($segment);
        $positiveCount = 0;
        $negativeCount = 0;
        
        foreach ($positiveWords as $word) {
            $positiveCount += substr_count($text, $word);
        }
        
        foreach ($negativeWords as $word) {
            $negativeCount += substr_count($text, $word);
        }
        
        $totalWords = str_word_count($text);
        $sentiment = 0;
        
        if ($totalWords > 0) {
            $sentiment = ($positiveCount - $negativeCount) / $totalWords;
        }
        
        return max(-1, min(1, $sentiment));
    }
    
    /**
     * Basic phrase extraction fallback
     */
    private function basicPhraseExtraction($text)
    {
        $phrases = [];
        
        // Look for common confidence indicators
        $patterns = [
            '/I (am|was) (confident|sure|certain) (that|about)/',
            '/I (think|believe|feel) (that|like)/',
            '/I (definitely|absolutely|really) (think|believe)/',
            '/I (have|had) experience (with|in)/',
            '/I (successfully|effectively) (did|completed|managed)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $match) {
                    $start = max(0, $match[1] - 20);
                    $phrase = substr($text, $start, 60);
                    $phrases[] = trim($phrase);
                }
            }
        }
        
        return array_slice(array_unique($phrases), 0, 10);
    }
    
    /**
     * Analyze sentiment with context awareness
     */
    public function analyzeSentimentWithContext($text, $context = [])
    {
        $analysis = $this->analyzeSentiment($text);
        
        // Adjust analysis based on context
        if (isset($context['interview_type'])) {
            $analysis = $this->adjustForInterviewType($analysis, $context['interview_type']);
        }
        
        if (isset($context['industry'])) {
            $analysis = $this->adjustForIndustry($analysis, $context['industry']);
        }
        
        return $analysis;
    }
    
    /**
     * Adjust sentiment analysis for interview type
     */
    private function adjustForInterviewType($analysis, $interviewType)
    {
        switch ($interviewType) {
            case 'technical':
                // Technical interviews may have lower emotional expression
                $analysis['emotions']['nervousness'] *= 1.2;
                $analysis['tone']['professional'] *= 1.1;
                break;
                
            case 'behavioral':
                // Behavioral interviews may have higher emotional expression
                $analysis['emotions']['enthusiasm'] *= 1.1;
                $analysis['tone']['friendly'] *= 1.1;
                break;
                
            case 'leadership':
                // Leadership interviews expect confidence
                $analysis['confidence_score'] *= 1.1;
                $analysis['tone']['assertive'] *= 1.1;
                break;
        }
        
        return $analysis;
    }
    
    /**
     * Adjust sentiment analysis for industry
     */
    private function adjustForIndustry($analysis, $industry)
    {
        switch ($industry) {
            case 'finance':
                $analysis['tone']['professional'] *= 1.1;
                $analysis['tone']['formal'] *= 1.1;
                break;
                
            case 'startup':
                $analysis['emotions']['enthusiasm'] *= 1.1;
                $analysis['tone']['casual'] *= 1.1;
                break;
                
            case 'healthcare':
                $analysis['emotions']['determination'] *= 1.1;
                $analysis['tone']['professional'] *= 1.1;
                break;
        }
        
        return $analysis;
    }
}
