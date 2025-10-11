<?php

namespace App\Services\AI;

use App\Services\AI\TranscriptionService;
use App\Services\AI\SentimentAnalysisService;
use App\Services\AI\KeywordExtractionService;
use App\Services\AI\PerformanceAnalysisService;

class InterviewAnalysisService
{
    private $transcriptionService;
    private $sentimentService;
    private $keywordService;
    private $performanceService;
    private $pdo;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->transcriptionService = new TranscriptionService();
        $this->sentimentService = new SentimentAnalysisService();
        $this->keywordService = new KeywordExtractionService();
        $this->performanceService = new PerformanceAnalysisService();
    }
    
    /**
     * Analyze complete interview
     */
    public function analyzeInterview($interviewId, $videoPath)
    {
        try {
            // Start analysis process
            $this->updateAnalysisStatus($interviewId, 'processing', 'Starting AI analysis...');
            
            // Step 1: Extract audio from video
            $audioPath = $this->extractAudio($videoPath);
            $this->updateAnalysisStatus($interviewId, 'processing', 'Audio extracted, starting transcription...');
            
            // Step 2: Generate transcription
            $transcription = $this->transcriptionService->transcribe($audioPath);
            $this->saveTranscription($interviewId, $transcription);
            $this->updateAnalysisStatus($interviewId, 'processing', 'Transcription complete, analyzing content...');
            
            // Step 3: Analyze sentiment
            $sentimentAnalysis = $this->sentimentService->analyzeSentiment($transcription['text']);
            
            // Step 4: Extract keywords and topics
            $keywords = $this->keywordService->extractKeywords($transcription['text']);
            $topics = $this->keywordService->extractTopics($transcription['text']);
            
            // Step 5: Analyze interview performance
            $performanceMetrics = $this->performanceService->analyzePerformance($transcription);
            
            // Step 6: Generate insights and recommendations
            $insights = $this->generateInsights($transcription, $sentimentAnalysis, $keywords, $performanceMetrics);
            
            // Step 7: Save complete analysis
            $analysisData = [
                'transcription' => $transcription,
                'sentiment' => $sentimentAnalysis,
                'keywords' => $keywords,
                'topics' => $topics,
                'performance' => $performanceMetrics,
                'insights' => $insights,
                'analysis_version' => '1.0',
                'processed_at' => date('Y-m-d H:i:s')
            ];
            
            $this->saveAnalysis($interviewId, $analysisData);
            $this->updateAnalysisStatus($interviewId, 'completed', 'AI analysis completed successfully');
            
            // Clean up temporary files
            unlink($audioPath);
            
            return $analysisData;
            
        } catch (\Exception $e) {
            $this->updateAnalysisStatus($interviewId, 'failed', 'Analysis failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get analysis results
     */
    public function getAnalysis($interviewId)
    {
        $sql = "SELECT * FROM interview_analysis WHERE interview_id = ? ORDER BY created_at DESC LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$interviewId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($result) {
            $result['analysis_data'] = json_decode($result['analysis_data'], true);
        }
        
        return $result;
    }
    
    /**
     * Generate AI-powered insights
     */
    private function generateInsights($transcription, $sentiment, $keywords, $performance)
    {
        $insights = [
            'overall_score' => $this->calculateOverallScore($sentiment, $performance),
            'strengths' => [],
            'areas_for_improvement' => [],
            'recommendations' => [],
            'communication_style' => $this->analyzeCommunicationStyle($transcription, $sentiment),
            'technical_competency' => $this->analyzeTechnicalCompetency($keywords, $transcription),
            'confidence_level' => $this->analyzeConfidenceLevel($sentiment, $performance),
            'interview_flow' => $this->analyzeInterviewFlow($transcription)
        ];
        
        // Analyze strengths
        if ($sentiment['overall_sentiment'] > 0.6) {
            $insights['strengths'][] = 'Positive and enthusiastic communication';
        }
        
        if ($performance['speaking_pace']['score'] > 0.7) {
            $insights['strengths'][] = 'Good speaking pace and clarity';
        }
        
        if (count($keywords['technical_terms']) > 10) {
            $insights['strengths'][] = 'Strong technical vocabulary';
        }
        
        // Identify areas for improvement
        if ($performance['filler_words']['count'] > 20) {
            $insights['areas_for_improvement'][] = 'Reduce use of filler words (um, uh, like)';
        }
        
        if ($sentiment['confidence_score'] < 0.5) {
            $insights['areas_for_improvement'][] = 'Increase confidence in responses';
        }
        
        if ($performance['response_length']['average'] < 30) {
            $insights['areas_for_improvement'][] = 'Provide more detailed responses';
        }
        
        // Generate recommendations
        $insights['recommendations'] = $this->generateRecommendations($insights, $performance);
        
        return $insights;
    }
    
    /**
     * Calculate overall interview score
     */
    private function calculateOverallScore($sentiment, $performance)
    {
        $sentimentScore = ($sentiment['overall_sentiment'] + 1) / 2; // Normalize to 0-1
        $confidenceScore = $sentiment['confidence_score'];
        $clarityScore = $performance['speaking_pace']['score'];
        $engagementScore = $performance['engagement_score'];
        
        $weights = [
            'sentiment' => 0.25,
            'confidence' => 0.30,
            'clarity' => 0.25,
            'engagement' => 0.20
        ];
        
        $overallScore = (
            $sentimentScore * $weights['sentiment'] +
            $confidenceScore * $weights['confidence'] +
            $clarityScore * $weights['clarity'] +
            $engagementScore * $weights['engagement']
        );
        
        return round($overallScore * 100, 1); // Return as percentage
    }
    
    /**
     * Analyze communication style
     */
    private function analyzeCommunicationStyle($transcription, $sentiment)
    {
        $style = [
            'formality' => $this->analyzeFormality($transcription['text']),
            'assertiveness' => $this->analyzeAssertiveness($transcription['text'], $sentiment),
            'enthusiasm' => $sentiment['emotions']['joy'] ?? 0,
            'clarity' => $this->analyzeClarity($transcription),
            'conciseness' => $this->analyzeConciseness($transcription)
        ];
        
        // Determine primary communication style
        if ($style['assertiveness'] > 0.7 && $style['enthusiasm'] > 0.6) {
            $style['primary_style'] = 'Confident and Enthusiastic';
        } elseif ($style['formality'] > 0.8 && $style['clarity'] > 0.7) {
            $style['primary_style'] = 'Professional and Clear';
        } elseif ($style['conciseness'] > 0.7 && $style['clarity'] > 0.7) {
            $style['primary_style'] = 'Direct and Efficient';
        } else {
            $style['primary_style'] = 'Conversational';
        }
        
        return $style;
    }
    
    /**
     * Analyze technical competency
     */
    private function analyzeTechnicalCompetency($keywords, $transcription)
    {
        $competency = [
            'technical_terms_count' => count($keywords['technical_terms']),
            'domain_expertise' => $this->assessDomainExpertise($keywords),
            'problem_solving_indicators' => $this->findProblemSolvingIndicators($transcription['text']),
            'experience_indicators' => $this->findExperienceIndicators($transcription['text']),
            'competency_level' => 'intermediate' // Default
        ];
        
        // Determine competency level
        $score = 0;
        $score += min($competency['technical_terms_count'] / 20, 1) * 0.4;
        $score += $competency['domain_expertise'] * 0.3;
        $score += min(count($competency['problem_solving_indicators']) / 5, 1) * 0.3;
        
        if ($score > 0.8) {
            $competency['competency_level'] = 'expert';
        } elseif ($score > 0.6) {
            $competency['competency_level'] = 'advanced';
        } elseif ($score > 0.4) {
            $competency['competency_level'] = 'intermediate';
        } else {
            $competency['competency_level'] = 'beginner';
        }
        
        return $competency;
    }
    
    /**
     * Analyze confidence level
     */
    private function analyzeConfidenceLevel($sentiment, $performance)
    {
        $confidence = [
            'verbal_confidence' => $sentiment['confidence_score'],
            'hesitation_indicators' => $performance['hesitation_count'],
            'assertive_language' => $this->countAssertiveLanguage($performance['text']),
            'uncertainty_markers' => $this->countUncertaintyMarkers($performance['text']),
            'overall_confidence' => 'moderate' // Default
        ];
        
        // Calculate overall confidence
        $score = $confidence['verbal_confidence'];
        $score -= min($confidence['hesitation_indicators'] / 10, 0.3);
        $score += min($confidence['assertive_language'] / 20, 0.2);
        $score -= min($confidence['uncertainty_markers'] / 15, 0.2);
        
        if ($score > 0.8) {
            $confidence['overall_confidence'] = 'very_high';
        } elseif ($score > 0.6) {
            $confidence['overall_confidence'] = 'high';
        } elseif ($score > 0.4) {
            $confidence['overall_confidence'] = 'moderate';
        } else {
            $confidence['overall_confidence'] = 'low';
        }
        
        return $confidence;
    }
    
    /**
     * Analyze interview flow and structure
     */
    private function analyzeInterviewFlow($transcription)
    {
        $flow = [
            'question_response_pairs' => $this->identifyQuestionResponsePairs($transcription),
            'topic_transitions' => $this->analyzeTopicTransitions($transcription),
            'engagement_points' => $this->identifyEngagementPoints($transcription),
            'flow_quality' => 'good' // Default
        ];
        
        // Analyze flow quality
        $pairCount = count($flow['question_response_pairs']);
        $transitionQuality = $this->assessTransitionQuality($flow['topic_transitions']);
        $engagementLevel = count($flow['engagement_points']) / max($pairCount, 1);
        
        $flowScore = ($transitionQuality + $engagementLevel) / 2;
        
        if ($flowScore > 0.8) {
            $flow['flow_quality'] = 'excellent';
        } elseif ($flowScore > 0.6) {
            $flow['flow_quality'] = 'good';
        } elseif ($flowScore > 0.4) {
            $flow['flow_quality'] = 'fair';
        } else {
            $flow['flow_quality'] = 'poor';
        }
        
        return $flow;
    }
    
    /**
     * Generate personalized recommendations
     */
    private function generateRecommendations($insights, $performance)
    {
        $recommendations = [];
        
        // Communication recommendations
        if ($insights['confidence_level']['overall_confidence'] === 'low') {
            $recommendations[] = [
                'category' => 'confidence',
                'title' => 'Build Confidence',
                'description' => 'Practice speaking about your experiences with specific examples and metrics',
                'priority' => 'high'
            ];
        }
        
        // Technical recommendations
        if ($insights['technical_competency']['competency_level'] === 'beginner') {
            $recommendations[] = [
                'category' => 'technical',
                'title' => 'Strengthen Technical Knowledge',
                'description' => 'Study core concepts and practice explaining technical topics clearly',
                'priority' => 'high'
            ];
        }
        
        // Speaking recommendations
        if ($performance['filler_words']['count'] > 15) {
            $recommendations[] = [
                'category' => 'speaking',
                'title' => 'Reduce Filler Words',
                'description' => 'Practice pausing instead of using filler words like "um" and "uh"',
                'priority' => 'medium'
            ];
        }
        
        // Structure recommendations
        if ($insights['interview_flow']['flow_quality'] === 'poor') {
            $recommendations[] = [
                'category' => 'structure',
                'title' => 'Improve Response Structure',
                'description' => 'Use the STAR method (Situation, Task, Action, Result) for behavioral questions',
                'priority' => 'medium'
            ];
        }
        
        return $recommendations;
    }
    
    /**
     * Extract audio from video file
     */
    private function extractAudio($videoPath)
    {
        $audioPath = sys_get_temp_dir() . '/' . uniqid() . '.wav';
        
        $command = sprintf(
            'ffmpeg -i %s -vn -acodec pcm_s16le -ar 16000 -ac 1 %s 2>/dev/null',
            escapeshellarg($videoPath),
            escapeshellarg($audioPath)
        );
        
        exec($command, $output, $returnCode);
        
        if ($returnCode !== 0 || !file_exists($audioPath)) {
            throw new \Exception('Failed to extract audio from video');
        }
        
        return $audioPath;
    }
    
    /**
     * Save transcription to database
     */
    private function saveTranscription($interviewId, $transcription)
    {
        $sql = "INSERT INTO interview_transcriptions (interview_id, transcription_data, created_at) 
                VALUES (?, ?, NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$interviewId, json_encode($transcription)]);
    }
    
    /**
     * Save complete analysis to database
     */
    private function saveAnalysis($interviewId, $analysisData)
    {
        $sql = "INSERT INTO interview_analysis (interview_id, analysis_data, status, created_at) 
                VALUES (?, ?, 'completed', NOW())
                ON DUPLICATE KEY UPDATE 
                analysis_data = VALUES(analysis_data), 
                status = VALUES(status), 
                updated_at = NOW()";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$interviewId, json_encode($analysisData)]);
    }
    
    /**
     * Update analysis status
     */
    private function updateAnalysisStatus($interviewId, $status, $message = null)
    {
        $sql = "INSERT INTO interview_analysis (interview_id, status, status_message, created_at) 
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                status_message = VALUES(status_message), 
                updated_at = NOW()";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$interviewId, $status, $message]);
    }
    
    // Helper methods for analysis (simplified implementations)
    private function analyzeFormality($text) { return 0.7; }
    private function analyzeAssertiveness($text, $sentiment) { return 0.6; }
    private function analyzeClarity($transcription) { return 0.8; }
    private function analyzeConciseness($transcription) { return 0.7; }
    private function assessDomainExpertise($keywords) { return 0.6; }
    private function findProblemSolvingIndicators($text) { return ['analyzed', 'solved', 'implemented']; }
    private function findExperienceIndicators($text) { return ['years', 'projects', 'led']; }
    private function countAssertiveLanguage($text) { return 5; }
    private function countUncertaintyMarkers($text) { return 3; }
    private function identifyQuestionResponsePairs($transcription) { return []; }
    private function analyzeTopicTransitions($transcription) { return []; }
    private function identifyEngagementPoints($transcription) { return []; }
    private function assessTransitionQuality($transitions) { return 0.7; }
}
