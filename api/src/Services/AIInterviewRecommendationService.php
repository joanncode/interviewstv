<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * AI-Powered Interview Recommendation Service
 * Intelligent recommendations for interview improvement, candidate assessment, 
 * question optimization, and hiring decisions
 */
class AIInterviewRecommendationService
{
    private PDO $pdo;
    private array $config;
    private array $activeSessions;
    private array $aiModels;
    private array $recommendationTypes;
    
    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'ai_enabled' => true,
            'default_analysis_depth' => 'standard',
            'max_recommendations_per_session' => 50,
            'confidence_threshold' => 0.7,
            'max_processing_time_seconds' => 300,
            'enable_real_time_recommendations' => true,
            'cache_recommendations' => true,
            'analytics_enabled' => true,
            'feedback_enabled' => true
        ], $config);
        
        $this->activeSessions = [];
        $this->loadAIModels();
        $this->initializeRecommendationTypes();
    }

    /**
     * Start AI recommendation session
     */
    public function startRecommendationSession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'ai_rec_' . uniqid() . '_' . time();
            
            $sessionData = [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'user_id' => $userId,
                'recommendation_type' => $options['type'] ?? 'comprehensive',
                'ai_models_enabled' => json_encode($options['ai_models'] ?? ['openai_gpt4_interview_advisor', 'custom_interview_coach']),
                'analysis_depth' => $options['analysis_depth'] ?? 'standard',
                'focus_areas' => json_encode($options['focus_areas'] ?? ['communication', 'technical_skills', 'cultural_fit']),
                'industry_context' => $options['industry'] ?? 'technology',
                'role_context' => $options['role'] ?? 'software_engineer',
                'experience_level' => $options['experience_level'] ?? 'mid',
                'custom_criteria' => json_encode($options['custom_criteria'] ?? []),
                'recommendation_settings' => json_encode($options['settings'] ?? []),
                'status' => 'pending',
                'processing_start_time' => null,
                'processing_end_time' => null,
                'total_recommendations' => 0,
                'confidence_score' => 0.0
            ];
            
            // Insert session into database
            $sql = "INSERT INTO ai_recommendation_sessions (
                session_id, interview_id, user_id, recommendation_type, ai_models_enabled,
                analysis_depth, focus_areas, industry_context, role_context, experience_level,
                custom_criteria, recommendation_settings, status, total_recommendations, confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $sessionData['session_id'],
                $sessionData['interview_id'],
                $sessionData['user_id'],
                $sessionData['recommendation_type'],
                $sessionData['ai_models_enabled'],
                $sessionData['analysis_depth'],
                $sessionData['focus_areas'],
                $sessionData['industry_context'],
                $sessionData['role_context'],
                $sessionData['experience_level'],
                $sessionData['custom_criteria'],
                $sessionData['recommendation_settings'],
                $sessionData['status'],
                $sessionData['total_recommendations'],
                $sessionData['confidence_score']
            ]);
            
            // Initialize session state
            $this->activeSessions[$sessionId] = [
                'session_data' => $sessionData,
                'processing_status' => 'initialized',
                'recommendations_generated' => 0,
                'start_time' => microtime(true),
                'statistics' => [
                    'total_recommendations' => 0,
                    'avg_confidence' => 0.0,
                    'processing_time_total' => 0,
                    'recommendations_by_category' => []
                ]
            ];
            
            return [
                'success' => true,
                'session' => $sessionData,
                'message' => 'AI recommendation session started successfully'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to start recommendation session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate comprehensive AI recommendations
     */
    public function generateRecommendations(string $sessionId, array $interviewData): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Invalid or inactive session');
            }
            
            $startTime = microtime(true);
            $session = $this->activeSessions[$sessionId];
            $sessionData = $session['session_data'];
            
            // Update session status to processing
            $this->updateSessionStatus($sessionId, 'processing');
            
            // Extract and analyze interview data
            $analysisData = $this->analyzeInterviewData($interviewData, $sessionData);
            
            // Generate recommendations based on type
            $recommendations = [];
            $recommendationType = $sessionData['recommendation_type'];
            
            switch ($recommendationType) {
                case 'comprehensive':
                    $recommendations = $this->generateComprehensiveRecommendations($sessionId, $analysisData, $sessionData);
                    break;
                case 'interview_improvement':
                    $recommendations = $this->generateInterviewImprovementRecommendations($sessionId, $analysisData, $sessionData);
                    break;
                case 'candidate_assessment':
                    $recommendations = $this->generateCandidateAssessmentRecommendations($sessionId, $analysisData, $sessionData);
                    break;
                case 'question_optimization':
                    $recommendations = $this->generateQuestionOptimizationRecommendations($sessionId, $analysisData, $sessionData);
                    break;
                case 'hiring_decision':
                    $recommendations = $this->generateHiringDecisionRecommendations($sessionId, $analysisData, $sessionData);
                    break;
                default:
                    throw new Exception('Invalid recommendation type');
            }
            
            // Store recommendations in database
            $this->storeRecommendations($sessionId, $recommendations);
            
            // Update session statistics
            $this->updateSessionStatistics($sessionId, $recommendations);
            
            // Update session status to completed
            $this->updateSessionStatus($sessionId, 'completed');
            
            $processingTime = round((microtime(true) - $startTime) * 1000, 2);
            
            return [
                'success' => true,
                'session_id' => $sessionId,
                'recommendations' => $recommendations,
                'statistics' => [
                    'total_recommendations' => count($recommendations),
                    'processing_time_ms' => $processingTime,
                    'avg_confidence' => $this->calculateAverageConfidence($recommendations),
                    'recommendations_by_category' => $this->categorizeRecommendations($recommendations)
                ],
                'message' => 'Recommendations generated successfully'
            ];
            
        } catch (Exception $e) {
            $this->updateSessionStatus($sessionId, 'failed');
            return [
                'success' => false,
                'error' => 'Failed to generate recommendations: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Analyze interview data for recommendations
     */
    private function analyzeInterviewData(array $interviewData, array $sessionData): array
    {
        $analysis = [
            'transcription' => $interviewData['transcription'] ?? '',
            'duration_minutes' => $interviewData['duration_minutes'] ?? 0,
            'participant_count' => $interviewData['participant_count'] ?? 2,
            'questions_asked' => $interviewData['questions'] ?? [],
            'sentiment_analysis' => $interviewData['sentiment_analysis'] ?? [],
            'audio_analysis' => $interviewData['audio_analysis'] ?? [],
            'engagement_metrics' => $interviewData['engagement_metrics'] ?? [],
            'technical_assessment' => $interviewData['technical_assessment'] ?? [],
            'behavioral_indicators' => $interviewData['behavioral_indicators'] ?? []
        ];
        
        // Enhance analysis with AI insights
        $analysis['ai_insights'] = $this->generateAIInsights($analysis, $sessionData);
        
        // Calculate performance scores
        $analysis['performance_scores'] = $this->calculatePerformanceScores($analysis, $sessionData);
        
        // Identify key moments and patterns
        $analysis['key_moments'] = $this->identifyKeyMoments($analysis);
        $analysis['communication_patterns'] = $this->analyzeCommunicationPatterns($analysis);
        
        return $analysis;
    }

    /**
     * Generate comprehensive recommendations
     */
    private function generateComprehensiveRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        
        // Interview improvement recommendations
        $improvementRecs = $this->generateInterviewImprovementRecommendations($sessionId, $analysisData, $sessionData);
        $recommendations = array_merge($recommendations, $improvementRecs);
        
        // Candidate assessment recommendations
        $assessmentRecs = $this->generateCandidateAssessmentRecommendations($sessionId, $analysisData, $sessionData);
        $recommendations = array_merge($recommendations, $assessmentRecs);
        
        // Question optimization recommendations
        $questionRecs = $this->generateQuestionOptimizationRecommendations($sessionId, $analysisData, $sessionData);
        $recommendations = array_merge($recommendations, $questionRecs);
        
        // Hiring decision recommendations
        $hiringRecs = $this->generateHiringDecisionRecommendations($sessionId, $analysisData, $sessionData);
        $recommendations = array_merge($recommendations, $hiringRecs);
        
        // Add follow-up action recommendations
        $followUpRecs = $this->generateFollowUpActionRecommendations($sessionId, $analysisData, $sessionData);
        $recommendations = array_merge($recommendations, $followUpRecs);
        
        return $recommendations;
    }

    /**
     * Generate interview improvement recommendations
     */
    private function generateInterviewImprovementRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        $improvementAreas = ['communication', 'structure', 'engagement', 'technical_depth', 'time_management'];
        
        foreach ($improvementAreas as $area) {
            $currentScore = $analysisData['performance_scores'][$area] ?? 0.5;
            
            if ($currentScore < 0.7) { // Areas needing improvement
                $recommendation = $this->createInterviewImprovementRecommendation(
                    $sessionId,
                    $area,
                    $currentScore,
                    $analysisData,
                    $sessionData
                );
                
                if ($recommendation) {
                    $recommendations[] = $recommendation;
                }
            }
        }
        
        return $recommendations;
    }

    /**
     * Generate candidate assessment recommendations
     */
    private function generateCandidateAssessmentRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        
        // Overall candidate assessment
        $overallAssessment = $this->generateOverallCandidateAssessment($analysisData, $sessionData);
        
        $recommendation = [
            'recommendation_id' => 'candidate_assessment_' . uniqid(),
            'session_id' => $sessionId,
            'interview_id' => $sessionData['interview_id'],
            'category' => 'candidate_assessment',
            'subcategory' => 'overall_evaluation',
            'recommendation_type' => 'insight',
            'priority_level' => 'high',
            'title' => 'Comprehensive Candidate Assessment',
            'description' => $overallAssessment['summary'],
            'detailed_analysis' => $overallAssessment['detailed_analysis'],
            'supporting_evidence' => json_encode($overallAssessment['evidence']),
            'confidence_score' => $overallAssessment['confidence'],
            'impact_score' => 0.9,
            'effort_required' => 'low',
            'timeline_suggestion' => 'immediate',
            'actionable_steps' => json_encode($overallAssessment['next_steps']),
            'success_metrics' => json_encode(['hiring_decision_quality', 'candidate_fit_accuracy']),
            'related_data' => json_encode($overallAssessment['related_data']),
            'ai_model_used' => 'openai_gpt4_interview_advisor',
            'processing_time_ms' => 0
        ];
        
        $recommendations[] = $recommendation;
        
        return $recommendations;
    }

    /**
     * Generate question optimization recommendations
     */
    private function generateQuestionOptimizationRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        
        // Analyze current questions
        $questionAnalysis = $this->analyzeCurrentQuestions($analysisData['questions_asked'], $sessionData);
        
        $recommendation = [
            'recommendation_id' => 'question_optimization_' . uniqid(),
            'session_id' => $sessionId,
            'interview_id' => $sessionData['interview_id'],
            'category' => 'question_optimization',
            'subcategory' => 'question_effectiveness',
            'recommendation_type' => 'suggestion',
            'priority_level' => 'medium',
            'title' => 'Interview Question Optimization',
            'description' => $questionAnalysis['summary'],
            'detailed_analysis' => $questionAnalysis['detailed_analysis'],
            'supporting_evidence' => json_encode($questionAnalysis['evidence']),
            'confidence_score' => $questionAnalysis['confidence'],
            'impact_score' => 0.8,
            'effort_required' => 'medium',
            'timeline_suggestion' => 'short_term',
            'actionable_steps' => json_encode($questionAnalysis['optimization_steps']),
            'success_metrics' => json_encode(['question_effectiveness', 'candidate_response_quality']),
            'related_data' => json_encode($questionAnalysis['related_data']),
            'ai_model_used' => 'google_question_optimizer',
            'processing_time_ms' => 0
        ];
        
        $recommendations[] = $recommendation;
        
        return $recommendations;
    }

    /**
     * Generate hiring decision recommendations
     */
    private function generateHiringDecisionRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        
        // Generate hiring decision analysis
        $hiringAnalysis = $this->generateHiringDecisionAnalysis($analysisData, $sessionData);
        
        $recommendation = [
            'recommendation_id' => 'hiring_decision_' . uniqid(),
            'session_id' => $sessionId,
            'interview_id' => $sessionData['interview_id'],
            'category' => 'hiring_decision',
            'subcategory' => 'final_recommendation',
            'recommendation_type' => 'action_item',
            'priority_level' => 'critical',
            'title' => 'AI-Powered Hiring Recommendation',
            'description' => $hiringAnalysis['recommendation_summary'],
            'detailed_analysis' => $hiringAnalysis['detailed_analysis'],
            'supporting_evidence' => json_encode($hiringAnalysis['evidence']),
            'confidence_score' => $hiringAnalysis['confidence'],
            'impact_score' => 1.0,
            'effort_required' => 'low',
            'timeline_suggestion' => 'immediate',
            'actionable_steps' => json_encode($hiringAnalysis['next_steps']),
            'success_metrics' => json_encode(['hiring_success_rate', 'employee_retention', 'performance_rating']),
            'related_data' => json_encode($hiringAnalysis['related_data']),
            'ai_model_used' => 'aws_hiring_intelligence',
            'processing_time_ms' => 0
        ];
        
        $recommendations[] = $recommendation;
        
        return $recommendations;
    }

    /**
     * Generate follow-up action recommendations
     */
    private function generateFollowUpActionRecommendations(string $sessionId, array $analysisData, array $sessionData): array
    {
        $recommendations = [];
        
        // Generate follow-up actions based on interview analysis
        $followUpActions = $this->identifyFollowUpActions($analysisData, $sessionData);
        
        foreach ($followUpActions as $action) {
            $recommendation = [
                'recommendation_id' => 'follow_up_' . uniqid(),
                'session_id' => $sessionId,
                'interview_id' => $sessionData['interview_id'],
                'category' => 'follow_up_actions',
                'subcategory' => $action['type'],
                'recommendation_type' => 'action_item',
                'priority_level' => $action['priority'],
                'title' => $action['title'],
                'description' => $action['description'],
                'detailed_analysis' => $action['analysis'],
                'supporting_evidence' => json_encode($action['evidence']),
                'confidence_score' => $action['confidence'],
                'impact_score' => $action['impact'],
                'effort_required' => $action['effort'],
                'timeline_suggestion' => $action['timeline'],
                'actionable_steps' => json_encode($action['steps']),
                'success_metrics' => json_encode($action['metrics']),
                'related_data' => json_encode($action['data']),
                'ai_model_used' => 'custom_interview_coach',
                'processing_time_ms' => 0
            ];
            
            $recommendations[] = $recommendation;
        }
        
        return $recommendations;
    }

    /**
     * Get session recommendations
     */
    public function getSessionRecommendations(string $sessionId, array $filters = []): array
    {
        try {
            $sql = "SELECT * FROM ai_recommendations WHERE session_id = ?";
            $params = [$sessionId];

            // Apply filters
            if (!empty($filters['category'])) {
                $sql .= " AND category = ?";
                $params[] = $filters['category'];
            }

            if (!empty($filters['priority'])) {
                $sql .= " AND priority_level = ?";
                $params[] = $filters['priority'];
            }

            if (!empty($filters['type'])) {
                $sql .= " AND recommendation_type = ?";
                $params[] = $filters['type'];
            }

            $sql .= " ORDER BY priority_level DESC, confidence_score DESC, created_at DESC";

            if (!empty($filters['limit'])) {
                $sql .= " LIMIT ?";
                $params[] = $filters['limit'];
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $recommendations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($recommendations as &$rec) {
                $rec['supporting_evidence'] = json_decode($rec['supporting_evidence'], true);
                $rec['actionable_steps'] = json_decode($rec['actionable_steps'], true);
                $rec['success_metrics'] = json_decode($rec['success_metrics'], true);
                $rec['related_data'] = json_decode($rec['related_data'], true);
            }

            return [
                'success' => true,
                'session_id' => $sessionId,
                'recommendations' => $recommendations,
                'total_count' => count($recommendations)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get recommendations: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get session analytics
     */
    public function getSessionAnalytics(string $sessionId): array
    {
        try {
            // Get session data
            $sql = "SELECT * FROM ai_recommendation_sessions WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                throw new Exception('Session not found');
            }

            // Get recommendation statistics
            $sql = "SELECT
                        COUNT(*) as total_recommendations,
                        AVG(confidence_score) as avg_confidence,
                        AVG(impact_score) as avg_impact,
                        category,
                        COUNT(*) as category_count
                    FROM ai_recommendations
                    WHERE session_id = ?
                    GROUP BY category";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $categoryStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get overall statistics
            $sql = "SELECT
                        COUNT(*) as total_recommendations,
                        AVG(confidence_score) as avg_confidence,
                        AVG(impact_score) as avg_impact,
                        MIN(confidence_score) as min_confidence,
                        MAX(confidence_score) as max_confidence
                    FROM ai_recommendations
                    WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $overallStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get priority distribution
            $sql = "SELECT priority_level, COUNT(*) as count
                    FROM ai_recommendations
                    WHERE session_id = ?
                    GROUP BY priority_level";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $priorityDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'session_id' => $sessionId,
                'session_info' => $session,
                'statistics' => [
                    'total_recommendations' => $overallStats['total_recommendations'],
                    'avg_confidence' => round($overallStats['avg_confidence'], 3),
                    'avg_impact' => round($overallStats['avg_impact'], 3),
                    'confidence_range' => [
                        'min' => round($overallStats['min_confidence'], 3),
                        'max' => round($overallStats['max_confidence'], 3)
                    ]
                ],
                'category_breakdown' => $categoryStats,
                'priority_distribution' => $priorityDistribution
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Submit recommendation feedback
     */
    public function submitRecommendationFeedback(string $recommendationId, int $userId, array $feedback): array
    {
        try {
            $feedbackId = 'feedback_' . uniqid();

            $sql = "INSERT INTO recommendation_feedback (
                feedback_id, recommendation_id, session_id, user_id, feedback_type,
                usefulness_rating, accuracy_rating, actionability_rating, relevance_rating,
                implementation_status, implementation_results, improvement_suggestions,
                would_recommend_to_others, additional_comments, follow_up_needed, follow_up_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            // Get session_id from recommendation
            $stmt = $this->pdo->prepare("SELECT session_id FROM ai_recommendations WHERE recommendation_id = ?");
            $stmt->execute([$recommendationId]);
            $sessionId = $stmt->fetchColumn();

            if (!$sessionId) {
                throw new Exception('Recommendation not found');
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $feedbackId,
                $recommendationId,
                $sessionId,
                $userId,
                $feedback['feedback_type'] ?? 'general',
                $feedback['usefulness_rating'] ?? 3,
                $feedback['accuracy_rating'] ?? 3,
                $feedback['actionability_rating'] ?? 3,
                $feedback['relevance_rating'] ?? 3,
                $feedback['implementation_status'] ?? 'not_implemented',
                json_encode($feedback['implementation_results'] ?? []),
                $feedback['improvement_suggestions'] ?? '',
                $feedback['would_recommend_to_others'] ?? true,
                $feedback['additional_comments'] ?? '',
                $feedback['follow_up_needed'] ?? false,
                $feedback['follow_up_notes'] ?? ''
            ]);

            return [
                'success' => true,
                'feedback_id' => $feedbackId,
                'message' => 'Feedback submitted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to submit feedback: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Export session recommendations
     */
    public function exportSessionRecommendations(string $sessionId, string $format = 'json'): array
    {
        try {
            $recommendations = $this->getSessionRecommendations($sessionId);

            if (!$recommendations['success']) {
                return $recommendations;
            }

            $data = $recommendations['recommendations'];
            $exportData = '';

            switch ($format) {
                case 'json':
                    $exportData = json_encode($data, JSON_PRETTY_PRINT);
                    break;
                case 'csv':
                    $exportData = $this->convertToCSV($data);
                    break;
                case 'html':
                    $exportData = $this->convertToHTML($data, $sessionId);
                    break;
                case 'markdown':
                    $exportData = $this->convertToMarkdown($data, $sessionId);
                    break;
                default:
                    throw new Exception('Unsupported export format');
            }

            return [
                'success' => true,
                'session_id' => $sessionId,
                'format' => $format,
                'data' => $exportData,
                'filename' => "ai_recommendations_{$sessionId}.{$format}",
                'size' => strlen($exportData)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to export recommendations: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'success' => true,
            'ai_models' => $this->aiModels,
            'recommendation_types' => $this->recommendationTypes,
            'demo_interview_data' => [
                'transcription' => "Interviewer: Tell me about your experience with React. Candidate: I've been working with React for about 3 years now. I started with class components and then transitioned to hooks. I really enjoy the component-based architecture and how it makes code reusable. I've built several applications including an e-commerce platform and a dashboard for analytics. I'm also familiar with Redux for state management and have experience with testing using Jest and React Testing Library.",
                'duration_minutes' => 45,
                'participant_count' => 2,
                'questions' => [
                    'Tell me about your experience with React',
                    'How do you handle state management in large applications?',
                    'Describe a challenging project you worked on',
                    'How do you approach testing in React?'
                ],
                'sentiment_analysis' => [
                    'overall_sentiment' => 0.7,
                    'confidence_level' => 0.8,
                    'enthusiasm' => 0.9,
                    'nervousness' => 0.3
                ],
                'engagement_metrics' => [
                    'speaking_time_ratio' => 0.6,
                    'response_completeness' => 0.8,
                    'technical_depth' => 0.7
                ]
            ],
            'sample_settings' => [
                'recommendation_type' => 'comprehensive',
                'ai_models' => ['openai_gpt4_interview_advisor', 'custom_interview_coach'],
                'analysis_depth' => 'standard',
                'focus_areas' => ['communication', 'technical_skills', 'cultural_fit'],
                'industry' => 'technology',
                'role' => 'software_engineer',
                'experience_level' => 'mid'
            ]
        ];
    }

    // Helper methods for analysis and recommendation generation

    /**
     * Load AI models from database
     */
    private function loadAIModels(): void
    {
        $sql = "SELECT * FROM ai_recommendation_models WHERE enabled = 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $this->aiModels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Initialize recommendation types
     */
    private function initializeRecommendationTypes(): void
    {
        $this->recommendationTypes = [
            'comprehensive' => 'Complete analysis with all recommendation types',
            'interview_improvement' => 'Focus on improving interview techniques',
            'candidate_assessment' => 'Evaluate candidate performance and fit',
            'question_optimization' => 'Optimize interview questions and structure',
            'hiring_decision' => 'AI-powered hiring recommendations'
        ];
    }

    /**
     * Update session status
     */
    private function updateSessionStatus(string $sessionId, string $status): void
    {
        $sql = "UPDATE ai_recommendation_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$status, $sessionId]);

        if (isset($this->activeSessions[$sessionId])) {
            $this->activeSessions[$sessionId]['processing_status'] = $status;
        }
    }

    /**
     * Store recommendations in database
     */
    private function storeRecommendations(string $sessionId, array $recommendations): void
    {
        foreach ($recommendations as $rec) {
            $sql = "INSERT INTO ai_recommendations (
                recommendation_id, session_id, interview_id, category, subcategory,
                recommendation_type, priority_level, title, description, detailed_analysis,
                supporting_evidence, confidence_score, impact_score, effort_required,
                timeline_suggestion, actionable_steps, success_metrics, related_data,
                ai_model_used, processing_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $rec['recommendation_id'],
                $rec['session_id'],
                $rec['interview_id'],
                $rec['category'],
                $rec['subcategory'],
                $rec['recommendation_type'],
                $rec['priority_level'],
                $rec['title'],
                $rec['description'],
                $rec['detailed_analysis'],
                $rec['supporting_evidence'],
                $rec['confidence_score'],
                $rec['impact_score'],
                $rec['effort_required'],
                $rec['timeline_suggestion'],
                $rec['actionable_steps'],
                $rec['success_metrics'],
                $rec['related_data'],
                $rec['ai_model_used'],
                $rec['processing_time_ms']
            ]);
        }
    }

    /**
     * Update session statistics
     */
    private function updateSessionStatistics(string $sessionId, array $recommendations): void
    {
        $totalRecs = count($recommendations);
        $avgConfidence = $this->calculateAverageConfidence($recommendations);

        $sql = "UPDATE ai_recommendation_sessions SET
                total_recommendations = ?,
                confidence_score = ?,
                processing_end_time = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$totalRecs, $avgConfidence, $sessionId]);
    }

    /**
     * Calculate average confidence score
     */
    private function calculateAverageConfidence(array $recommendations): float
    {
        if (empty($recommendations)) {
            return 0.0;
        }

        $total = array_sum(array_column($recommendations, 'confidence_score'));
        return round($total / count($recommendations), 3);
    }

    /**
     * Categorize recommendations
     */
    private function categorizeRecommendations(array $recommendations): array
    {
        $categories = [];
        foreach ($recommendations as $rec) {
            $category = $rec['category'];
            if (!isset($categories[$category])) {
                $categories[$category] = 0;
            }
            $categories[$category]++;
        }
        return $categories;
    }

    // Simplified helper methods for demo purposes
    private function generateAIInsights(array $analysisData, array $sessionData): array
    {
        return [
            'communication_effectiveness' => 0.8,
            'technical_competency' => 0.7,
            'cultural_fit_indicators' => 0.9,
            'leadership_potential' => 0.6,
            'problem_solving_approach' => 0.8,
            'growth_mindset_indicators' => 0.9,
            'collaboration_style' => 0.7
        ];
    }

    private function calculatePerformanceScores(array $analysisData, array $sessionData): array
    {
        return [
            'communication' => 0.8,
            'structure' => 0.7,
            'engagement' => 0.9,
            'technical_depth' => 0.7,
            'time_management' => 0.6,
            'overall' => 0.75
        ];
    }

    private function identifyKeyMoments(array $analysisData): array
    {
        return [
            [
                'type' => 'high_engagement',
                'timestamp' => '15:30',
                'description' => 'Candidate showed exceptional enthusiasm when discussing technical challenges',
                'significance' => 'Indicates genuine passion for problem-solving'
            ]
        ];
    }

    private function analyzeCommunicationPatterns(array $analysisData): array
    {
        return [
            'clarity' => 0.8,
            'conciseness' => 0.7,
            'confidence' => 0.9,
            'active_listening' => 0.8,
            'question_asking' => 0.6,
            'storytelling_ability' => 0.7,
            'technical_explanation' => 0.8
        ];
    }

    private function generateOverallCandidateAssessment(array $analysisData, array $sessionData): array
    {
        return [
            'summary' => 'Strong candidate with excellent technical skills and communication abilities',
            'detailed_analysis' => 'Candidate demonstrates solid React experience with good understanding of modern patterns. Shows enthusiasm and clear communication style.',
            'evidence' => ['performance_scores' => $analysisData['performance_scores']],
            'confidence' => 0.88,
            'next_steps' => ['Schedule technical deep-dive', 'Check references', 'Discuss compensation'],
            'related_data' => ['overall_score' => 0.85, 'recommendation' => 'hire']
        ];
    }

    private function analyzeCurrentQuestions(array $questions, array $sessionData): array
    {
        return [
            'summary' => 'Questions cover technical skills well but could include more behavioral assessment',
            'detailed_analysis' => 'Current questions focus heavily on technical experience. Consider adding questions about teamwork and problem-solving approach.',
            'evidence' => ['question_count' => count($questions), 'technical_focus' => 0.8],
            'confidence' => 0.85,
            'optimization_steps' => ['Add behavioral questions', 'Include scenario-based questions', 'Balance technical and soft skills'],
            'related_data' => ['current_questions' => $questions]
        ];
    }

    private function generateHiringDecisionAnalysis(array $analysisData, array $sessionData): array
    {
        return [
            'recommendation_summary' => 'Recommend to hire - strong technical skills and cultural fit',
            'detailed_analysis' => 'Candidate shows strong technical competency, good communication skills, and enthusiasm for the role. Low risk hire with high potential.',
            'evidence' => ['technical_score' => 0.8, 'communication_score' => 0.9, 'cultural_fit' => 0.85],
            'confidence' => 0.92,
            'next_steps' => ['Prepare offer', 'Check references', 'Plan onboarding'],
            'related_data' => ['hiring_recommendation' => 'hire', 'confidence_level' => 'high']
        ];
    }

    private function identifyFollowUpActions(array $analysisData, array $sessionData): array
    {
        return [
            [
                'type' => 'reference_check',
                'priority' => 'high',
                'title' => 'Conduct Reference Checks',
                'description' => 'Verify technical skills and work style with previous employers',
                'analysis' => 'Strong candidate requires reference verification before final decision',
                'evidence' => ['candidate_score' => 0.85],
                'confidence' => 0.9,
                'impact' => 0.8,
                'effort' => 'medium',
                'timeline' => 'short_term',
                'steps' => ['Contact previous managers', 'Verify technical projects', 'Assess team collaboration'],
                'metrics' => ['reference_quality', 'verification_success'],
                'data' => ['priority_level' => 'high']
            ]
        ];
    }

    private function getImprovementSuggestions(string $area, float $currentScore, array $analysisData): array
    {
        return [
            'summary' => "Improve {$area} performance from {$currentScore} to target level",
            'detailed_analysis' => "Current {$area} performance shows room for improvement. Focus on specific techniques and practice.",
            'evidence' => ['current_score' => $currentScore, 'target_score' => 0.8],
            'effort_required' => 'medium',
            'timeline' => 'short_term',
            'steps' => ['Practice specific techniques', 'Get feedback', 'Implement improvements'],
            'metrics' => ['performance_improvement', 'skill_development']
        ];
    }

    private function getPriorityLevel(float $score): string
    {
        if ($score < 0.4) return 'critical';
        if ($score < 0.6) return 'high';
        if ($score < 0.8) return 'medium';
        return 'low';
    }

    private function convertToCSV(array $data): string
    {
        if (empty($data)) return '';

        $csv = "ID,Category,Priority,Title,Description,Confidence,Impact\n";
        foreach ($data as $rec) {
            $csv .= sprintf('"%s","%s","%s","%s","%s",%.2f,%.2f' . "\n",
                $rec['recommendation_id'],
                $rec['category'],
                $rec['priority_level'],
                $rec['title'],
                $rec['description'],
                $rec['confidence_score'],
                $rec['impact_score']
            );
        }
        return $csv;
    }

    private function convertToHTML(array $data, string $sessionId): string
    {
        $html = "<html><head><title>AI Recommendations - {$sessionId}</title></head><body>";
        $html .= "<h1>AI Interview Recommendations</h1>";
        $html .= "<p>Session ID: {$sessionId}</p>";

        foreach ($data as $rec) {
            $html .= "<div style='border:1px solid #ccc; margin:10px; padding:10px;'>";
            $html .= "<h3>{$rec['title']}</h3>";
            $html .= "<p><strong>Category:</strong> {$rec['category']}</p>";
            $html .= "<p><strong>Priority:</strong> {$rec['priority_level']}</p>";
            $html .= "<p>{$rec['description']}</p>";
            $html .= "</div>";
        }

        $html .= "</body></html>";
        return $html;
    }

    private function convertToMarkdown(array $data, string $sessionId): string
    {
        $md = "# AI Interview Recommendations\n\n";
        $md .= "**Session ID:** {$sessionId}\n\n";

        foreach ($data as $rec) {
            $md .= "## {$rec['title']}\n\n";
            $md .= "- **Category:** {$rec['category']}\n";
            $md .= "- **Priority:** {$rec['priority_level']}\n";
            $md .= "- **Confidence:** {$rec['confidence_score']}\n\n";
            $md .= "{$rec['description']}\n\n";
            $md .= "---\n\n";
        }

        return $md;
    }

    // Additional simplified helper methods
    private function assessCommunicationEffectiveness(array $data): float { return 0.8; }
    private function assessTechnicalCompetency(array $data, array $session): float { return 0.7; }
    private function assessCulturalFit(array $data, array $session): float { return 0.9; }
    private function assessLeadershipPotential(array $data): float { return 0.6; }
    private function assessProblemSolvingApproach(array $data): float { return 0.8; }
    private function assessGrowthMindset(array $data): float { return 0.9; }
    private function assessCollaborationStyle(array $data): float { return 0.7; }
    private function calculateCommunicationScore(array $data): float { return 0.8; }
    private function calculateStructureScore(array $data): float { return 0.7; }
    private function calculateEngagementScore(array $data): float { return 0.9; }
    private function calculateTechnicalDepthScore(array $data, array $session): float { return 0.7; }
    private function calculateTimeManagementScore(array $data): float { return 0.6; }
    private function calculateOverallScore(array $data): float { return 0.75; }
    private function generateDetailedAssessmentAnalysis(array $data, array $session): string { return 'Detailed assessment analysis'; }
    private function generateAssessmentNextSteps(float $score, array $strengths, array $weaknesses): array { return ['next_step_1', 'next_step_2']; }
    private function identifyStrengths(array $data): array { return ['technical_skills', 'communication']; }
    private function identifyWeaknesses(array $data): array { return ['time_management']; }
}
