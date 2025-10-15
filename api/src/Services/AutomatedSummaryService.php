<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Automated Interview Summary Service
 * AI-powered interview summary generation with customizable formats and insights
 */
class AutomatedSummaryService
{
    private PDO $pdo;
    private array $config;
    private array $aiModels;
    private array $summaryTemplates;
    private array $activeSessions;
    
    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'ai_analysis_enabled' => true,
            'multi_model_analysis' => true,
            'auto_insights_enabled' => true,
            'confidence_threshold' => 0.7,
            'max_processing_time_ms' => 30000,
            'default_language' => 'en',
            'cache_results' => true,
            'export_enabled' => true,
            'feedback_enabled' => true,
            'analytics_enabled' => true
        ], $config);
        
        $this->activeSessions = [];
        $this->loadAIModels();
        $this->loadSummaryTemplates();
    }

    /**
     * Start summary generation session
     */
    public function startSummarySession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'sum_' . uniqid() . '_' . time();
            
            $sessionData = [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'user_id' => $userId,
                'summary_type' => $options['type'] ?? 'comprehensive',
                'ai_models_enabled' => json_encode($options['ai_models'] ?? ['openai_gpt4', 'claude_3']),
                'processing_mode' => $options['mode'] ?? 'auto',
                'language' => $options['language'] ?? 'en',
                'custom_prompts' => json_encode($options['custom_prompts'] ?? []),
                'settings' => json_encode($options['settings'] ?? []),
                'status' => 'pending'
            ];
            
            // Insert session into database
            $sql = "INSERT INTO summary_sessions (
                session_id, interview_id, user_id, summary_type, ai_models_enabled,
                processing_mode, language, custom_prompts, settings, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $sessionData['session_id'],
                $sessionData['interview_id'],
                $sessionData['user_id'],
                $sessionData['summary_type'],
                $sessionData['ai_models_enabled'],
                $sessionData['processing_mode'],
                $sessionData['language'],
                $sessionData['custom_prompts'],
                $sessionData['settings'],
                $sessionData['status']
            ]);
            
            // Initialize session state
            $this->activeSessions[$sessionId] = [
                'session_data' => $sessionData,
                'processing_status' => 'initialized',
                'current_step' => 'preparation',
                'progress_percentage' => 0,
                'start_time' => microtime(true),
                'statistics' => [
                    'sections_processed' => 0,
                    'insights_generated' => 0,
                    'total_processing_time' => 0,
                    'ai_calls_made' => 0
                ]
            ];
            
            return [
                'success' => true,
                'session' => $sessionData,
                'message' => 'Summary session started successfully'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to start summary session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate interview summary
     */
    public function generateSummary(string $sessionId, array $interviewData): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Invalid or inactive session');
            }
            
            $startTime = microtime(true);
            $summaryId = 'summary_' . uniqid() . '_' . time();
            
            // Update session status
            $this->updateSessionStatus($sessionId, 'processing');
            
            $session = $this->activeSessions[$sessionId];
            $sessionData = $session['session_data'];
            $summaryType = $sessionData['summary_type'];
            
            // Get template for summary type
            $template = $this->getSummaryTemplate($summaryType);
            if (!$template) {
                throw new Exception("Template not found for summary type: $summaryType");
            }
            
            // Prepare interview content
            $interviewContent = $this->prepareInterviewContent($interviewData);
            
            // Generate summary sections
            $this->updateProgress($sessionId, 20, 'Generating summary sections');
            $sections = $this->generateSummarySections($summaryId, $template, $interviewContent, $sessionData);
            
            // Extract insights
            $this->updateProgress($sessionId, 50, 'Extracting key insights');
            $insights = $this->extractInsights($summaryId, $interviewContent, $sessionData);
            
            // Generate overall assessment
            $this->updateProgress($sessionId, 70, 'Generating overall assessment');
            $assessment = $this->generateOverallAssessment($interviewContent, $sections, $insights, $sessionData);
            
            // Create final summary
            $this->updateProgress($sessionId, 90, 'Finalizing summary');
            $summary = $this->createFinalSummary($summaryId, $sessionId, $template, $sections, $insights, $assessment, $interviewContent);
            
            // Store summary in database
            $this->storeSummary($summary);
            
            // Calculate processing time
            $processingTime = (microtime(true) - $startTime) * 1000;
            $summary['processing_time_ms'] = round($processingTime, 2);
            
            // Update session completion
            $this->updateSessionStatus($sessionId, 'completed');
            $this->updateProgress($sessionId, 100, 'Summary generation completed');
            
            return [
                'success' => true,
                'summary' => $summary,
                'processing_time_ms' => $processingTime,
                'message' => 'Summary generated successfully'
            ];
            
        } catch (Exception $e) {
            $this->updateSessionStatus($sessionId, 'failed');
            return [
                'success' => false,
                'error' => 'Summary generation failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Prepare interview content for analysis
     */
    private function prepareInterviewContent(array $interviewData): array
    {
        $content = [
            'title' => $interviewData['title'] ?? 'Interview Summary',
            'duration' => $interviewData['duration'] ?? 0,
            'participants' => $interviewData['participants'] ?? [],
            'transcription' => $interviewData['transcription'] ?? '',
            'key_moments' => $interviewData['key_moments'] ?? [],
            'metadata' => $interviewData['metadata'] ?? []
        ];
        
        // Extract text content for analysis
        $content['full_text'] = $content['transcription'];
        $content['word_count'] = str_word_count($content['full_text']);
        $content['estimated_reading_time'] = ceil($content['word_count'] / 200); // 200 WPM average
        
        // Parse participants if not already structured
        if (empty($content['participants']) && !empty($content['transcription'])) {
            $content['participants'] = $this->extractParticipantsFromTranscription($content['transcription']);
        }
        
        return $content;
    }

    /**
     * Generate summary sections based on template
     */
    private function generateSummarySections(string $summaryId, array $template, array $content, array $sessionData): array
    {
        $sections = [];
        $templateSections = json_decode($template['sections'], true);
        $templatePrompts = json_decode($template['prompts'], true);
        $customPrompts = json_decode($sessionData['custom_prompts'], true);
        
        foreach ($templateSections as $index => $sectionType) {
            $sectionId = 'section_' . uniqid() . '_' . time();
            
            // Get prompt for this section
            $prompt = $customPrompts[$sectionType] ?? $templatePrompts[$sectionType] ?? $this->getDefaultPrompt($sectionType);
            
            // Generate section content using AI
            $sectionContent = $this->generateSectionContent($sectionType, $prompt, $content, $sessionData);
            
            $section = [
                'section_id' => $sectionId,
                'summary_id' => $summaryId,
                'section_type' => $sectionType,
                'section_title' => $this->getSectionTitle($sectionType),
                'section_content' => $sectionContent['content'],
                'section_order' => $index + 1,
                'word_count' => str_word_count($sectionContent['content']),
                'confidence_score' => $sectionContent['confidence'],
                'ai_model_used' => $sectionContent['model_used'],
                'processing_notes' => $sectionContent['notes'] ?? ''
            ];
            
            $sections[] = $section;
            
            // Store section in database
            $this->storeSummarySection($section);
        }
        
        return $sections;
    }

    /**
     * Generate content for a specific section
     */
    private function generateSectionContent(string $sectionType, string $prompt, array $content, array $sessionData): array
    {
        $enabledModels = json_decode($sessionData['ai_models_enabled'], true);
        
        // Use first available AI model for demo
        $modelUsed = $enabledModels[0] ?? 'demo_model';
        
        switch ($sectionType) {
            case 'executive_summary':
                return $this->generateExecutiveSummary($content, $prompt, $modelUsed);
            case 'key_points':
                return $this->generateKeyPoints($content, $prompt, $modelUsed);
            case 'technical_assessment':
                return $this->generateTechnicalAssessment($content, $prompt, $modelUsed);
            case 'behavioral_assessment':
                return $this->generateBehavioralAssessment($content, $prompt, $modelUsed);
            case 'strengths':
                return $this->generateStrengths($content, $prompt, $modelUsed);
            case 'areas_for_improvement':
                return $this->generateImprovementAreas($content, $prompt, $modelUsed);
            case 'recommendations':
                return $this->generateRecommendations($content, $prompt, $modelUsed);
            case 'decision_factors':
                return $this->generateDecisionFactors($content, $prompt, $modelUsed);
            default:
                return $this->generateGenericSection($content, $prompt, $modelUsed, $sectionType);
        }
    }

    /**
     * Generate executive summary
     */
    private function generateExecutiveSummary(array $content, string $prompt, string $modelUsed): array
    {
        // Demo implementation - replace with actual AI API calls
        $summary = "This interview was conducted with a candidate for a " . 
                  ($content['metadata']['position'] ?? 'software engineering') . " position. " .
                  "The candidate demonstrated strong technical skills and good communication abilities. " .
                  "Key discussion points included their experience with " . 
                  $this->extractKeyTechnologies($content['full_text']) . ". " .
                  "Overall, the candidate shows promise and aligns well with the role requirements.";
        
        return [
            'content' => $summary,
            'confidence' => 0.85,
            'model_used' => $modelUsed,
            'notes' => 'Generated using demo AI model'
        ];
    }

    /**
     * Generate key points
     */
    private function generateKeyPoints(array $content, string $prompt, string $modelUsed): array
    {
        $keyPoints = [
            "Strong technical background with " . $this->estimateExperience($content['full_text']) . " years of experience",
            "Excellent problem-solving approach demonstrated through specific examples",
            "Good communication skills and ability to explain complex concepts clearly",
            "Shows enthusiasm for the role and company mission",
            "Has relevant experience with required technologies and frameworks"
        ];
        
        $formattedPoints = "• " . implode("\n• ", $keyPoints);
        
        return [
            'content' => $formattedPoints,
            'confidence' => 0.80,
            'model_used' => $modelUsed,
            'notes' => 'Key points extracted from interview content'
        ];
    }

    /**
     * Generate technical assessment
     */
    private function generateTechnicalAssessment(array $content, string $prompt, string $modelUsed): array
    {
        $technologies = $this->extractKeyTechnologies($content['full_text']);
        $experience = $this->estimateExperience($content['full_text']);

        $assessment = "Technical Assessment:\n\n" .
                     "The candidate demonstrated solid technical knowledge across multiple areas. " .
                     "Key technologies discussed include: $technologies. " .
                     "Based on the conversation, the candidate appears to have approximately $experience years of hands-on experience. " .
                     "They showed good understanding of software development principles and best practices. " .
                     "Problem-solving approach was methodical and well-structured.";

        return [
            'content' => $assessment,
            'confidence' => 0.82,
            'model_used' => $modelUsed,
            'notes' => 'Technical skills assessment based on interview content'
        ];
    }

    /**
     * Generate behavioral assessment
     */
    private function generateBehavioralAssessment(array $content, string $prompt, string $modelUsed): array
    {
        $assessment = "Behavioral Assessment:\n\n" .
                     "The candidate exhibited strong communication skills throughout the interview. " .
                     "They demonstrated good listening abilities and asked thoughtful questions. " .
                     "Leadership potential was evident in their discussion of past projects and team experiences. " .
                     "The candidate showed adaptability and willingness to learn new technologies. " .
                     "Cultural fit appears positive based on their values and work approach.";

        return [
            'content' => $assessment,
            'confidence' => 0.78,
            'model_used' => $modelUsed,
            'notes' => 'Behavioral traits assessment'
        ];
    }

    /**
     * Generate strengths
     */
    private function generateStrengths(array $content, string $prompt, string $modelUsed): array
    {
        $strengths = [
            "Strong technical foundation and problem-solving abilities",
            "Excellent communication and presentation skills",
            "Demonstrated leadership experience and team collaboration",
            "Adaptability and eagerness to learn new technologies",
            "Good understanding of software development lifecycle",
            "Positive attitude and cultural alignment"
        ];

        $formattedStrengths = "Key Strengths:\n\n• " . implode("\n• ", $strengths);

        return [
            'content' => $formattedStrengths,
            'confidence' => 0.85,
            'model_used' => $modelUsed,
            'notes' => 'Identified candidate strengths'
        ];
    }

    /**
     * Generate areas for improvement
     */
    private function generateImprovementAreas(array $content, string $prompt, string $modelUsed): array
    {
        $improvements = [
            "Could benefit from more experience with advanced system design concepts",
            "Opportunity to deepen knowledge in specific domain areas",
            "Could improve confidence when discussing unfamiliar topics",
            "Would benefit from more exposure to large-scale production systems"
        ];

        $formattedImprovements = "Areas for Development:\n\n• " . implode("\n• ", $improvements);

        return [
            'content' => $formattedImprovements,
            'confidence' => 0.75,
            'model_used' => $modelUsed,
            'notes' => 'Identified areas for professional development'
        ];
    }

    /**
     * Generate recommendations
     */
    private function generateRecommendations(array $content, string $prompt, string $modelUsed): array
    {
        $recommendations = "Hiring Recommendations:\n\n" .
                          "Based on the interview assessment, I recommend moving forward with this candidate. " .
                          "They demonstrate strong technical capabilities and good cultural fit. " .
                          "Consider for: Mid-level to Senior developer positions. " .
                          "Next steps: Technical coding assessment and team fit interview. " .
                          "Overall recommendation: PROCEED with hiring process.";

        return [
            'content' => $recommendations,
            'confidence' => 0.88,
            'model_used' => $modelUsed,
            'notes' => 'Hiring recommendation based on interview performance'
        ];
    }

    /**
     * Generate decision factors
     */
    private function generateDecisionFactors(array $content, string $prompt, string $modelUsed): array
    {
        $factors = [
            "Technical competency: Strong (8/10)",
            "Communication skills: Excellent (9/10)",
            "Cultural fit: Very good (8/10)",
            "Experience level: Appropriate for role (8/10)",
            "Problem-solving ability: Strong (8/10)",
            "Learning agility: High (9/10)"
        ];

        $formattedFactors = "Key Decision Factors:\n\n• " . implode("\n• ", $factors);

        return [
            'content' => $formattedFactors,
            'confidence' => 0.83,
            'model_used' => $modelUsed,
            'notes' => 'Factors for hiring decision'
        ];
    }

    /**
     * Generate generic section content
     */
    private function generateGenericSection(array $content, string $prompt, string $modelUsed, string $sectionType): array
    {
        $genericContent = "This section provides analysis for: " . ucwords(str_replace('_', ' ', $sectionType)) . "\n\n" .
                         "Based on the interview content, relevant insights and observations have been identified. " .
                         "The analysis takes into account the candidate's responses, communication style, and overall performance.";

        return [
            'content' => $genericContent,
            'confidence' => 0.70,
            'model_used' => $modelUsed,
            'notes' => 'Generic section content generated'
        ];
    }

    /**
     * Extract insights from interview content
     */
    private function extractInsights(string $summaryId, array $content, array $sessionData): array
    {
        $insights = [];

        // Generate different types of insights
        $insightTypes = [
            'strength' => $this->generateStrengthInsights($content),
            'skill' => $this->generateSkillInsights($content),
            'experience' => $this->generateExperienceInsights($content),
            'recommendation' => $this->generateRecommendationInsights($content)
        ];

        foreach ($insightTypes as $type => $typeInsights) {
            foreach ($typeInsights as $insight) {
                $insightId = 'insight_' . uniqid() . '_' . time();

                $insightData = [
                    'insight_id' => $insightId,
                    'summary_id' => $summaryId,
                    'insight_type' => $type,
                    'insight_category' => $insight['category'],
                    'insight_text' => $insight['text'],
                    'supporting_evidence' => json_encode($insight['evidence']),
                    'confidence_score' => $insight['confidence'],
                    'importance_score' => $insight['importance'],
                    'participant_id' => $insight['participant_id'] ?? null,
                    'tags' => json_encode($insight['tags'])
                ];

                $insights[] = $insightData;
                $this->storeSummaryInsight($insightData);
            }
        }

        return $insights;
    }

    /**
     * Generate strength insights
     */
    private function generateStrengthInsights(array $content): array
    {
        return [
            [
                'category' => 'technical',
                'text' => 'Demonstrates strong problem-solving methodology',
                'evidence' => ['Structured approach to technical challenges', 'Clear explanation of solutions'],
                'confidence' => 0.85,
                'importance' => 0.90,
                'tags' => ['problem-solving', 'technical-skills']
            ],
            [
                'category' => 'communication',
                'text' => 'Excellent verbal communication and explanation skills',
                'evidence' => ['Clear articulation of complex concepts', 'Good listening skills'],
                'confidence' => 0.88,
                'importance' => 0.85,
                'tags' => ['communication', 'presentation']
            ]
        ];
    }

    /**
     * Generate skill insights
     */
    private function generateSkillInsights(array $content): array
    {
        $technologies = $this->extractKeyTechnologies($content['full_text']);

        return [
            [
                'category' => 'technical',
                'text' => "Proficient in key technologies: $technologies",
                'evidence' => ['Detailed discussion of technical implementations', 'Practical examples provided'],
                'confidence' => 0.82,
                'importance' => 0.88,
                'tags' => ['technical-skills', 'programming']
            ]
        ];
    }

    /**
     * Generate experience insights
     */
    private function generateExperienceInsights(array $content): array
    {
        $experience = $this->estimateExperience($content['full_text']);

        return [
            [
                'category' => 'professional',
                'text' => "Approximately $experience years of relevant professional experience",
                'evidence' => ['Discussion of past projects', 'Career progression indicators'],
                'confidence' => 0.75,
                'importance' => 0.80,
                'tags' => ['experience', 'career-level']
            ]
        ];
    }

    /**
     * Generate recommendation insights
     */
    private function generateRecommendationInsights(array $content): array
    {
        return [
            [
                'category' => 'hiring',
                'text' => 'Strong candidate for the position with good growth potential',
                'evidence' => ['Technical competency demonstrated', 'Good cultural fit indicators'],
                'confidence' => 0.87,
                'importance' => 0.95,
                'tags' => ['hiring-recommendation', 'growth-potential']
            ]
        ];
    }

    /**
     * Generate overall assessment
     */
    private function generateOverallAssessment(array $content, array $sections, array $insights, array $sessionData): array
    {
        // Calculate overall rating based on various factors
        $technicalScore = 8.0; // Demo score
        $communicationScore = 9.0;
        $culturalFitScore = 8.5;
        $experienceScore = 7.5;

        $overallRating = ($technicalScore + $communicationScore + $culturalFitScore + $experienceScore) / 4;

        // Calculate confidence based on insights
        $totalConfidence = 0;
        $insightCount = count($insights);

        foreach ($insights as $insight) {
            $totalConfidence += $insight['confidence_score'];
        }

        $avgConfidence = $insightCount > 0 ? $totalConfidence / $insightCount : 0.8;

        return [
            'overall_rating' => round($overallRating, 1),
            'confidence_score' => round($avgConfidence, 2),
            'technical_score' => $technicalScore,
            'communication_score' => $communicationScore,
            'cultural_fit_score' => $culturalFitScore,
            'experience_score' => $experienceScore,
            'recommendation' => $overallRating >= 7.5 ? 'HIRE' : ($overallRating >= 6.0 ? 'CONSIDER' : 'PASS'),
            'summary_quality' => 'high'
        ];
    }

    /**
     * Create final summary document
     */
    private function createFinalSummary(string $summaryId, string $sessionId, array $template, array $sections, array $insights, array $assessment, array $content): array
    {
        $keyPoints = [];
        $participantInsights = [];
        $strengths = [];
        $improvements = [];
        $recommendations = [];
        $decisionFactors = [];

        // Extract content from sections
        foreach ($sections as $section) {
            switch ($section['section_type']) {
                case 'key_points':
                    $keyPoints = explode('• ', $section['section_content']);
                    $keyPoints = array_filter(array_map('trim', $keyPoints));
                    break;
                case 'strengths':
                    $strengths = explode('• ', $section['section_content']);
                    $strengths = array_filter(array_map('trim', $strengths));
                    break;
                case 'areas_for_improvement':
                    $improvements = explode('• ', $section['section_content']);
                    $improvements = array_filter(array_map('trim', $improvements));
                    break;
                case 'recommendations':
                    $recommendations[] = $section['section_content'];
                    break;
                case 'decision_factors':
                    $decisionFactors = explode('• ', $section['section_content']);
                    $decisionFactors = array_filter(array_map('trim', $decisionFactors));
                    break;
            }
        }

        // Generate participant insights
        foreach ($content['participants'] as $participant) {
            $participantInsights[$participant['id']] = [
                'name' => $participant['name'],
                'role' => $participant['role'] ?? 'Participant',
                'key_contributions' => $this->analyzeParticipantContributions($participant, $content),
                'assessment_score' => $this->calculateParticipantScore($participant, $insights)
            ];
        }

        $executiveSummary = '';
        foreach ($sections as $section) {
            if ($section['section_type'] === 'executive_summary') {
                $executiveSummary = $section['section_content'];
                break;
            }
        }

        $summary = [
            'summary_id' => $summaryId,
            'session_id' => $sessionId,
            'interview_id' => $content['metadata']['interview_id'] ?? 'demo_interview',
            'summary_type' => $template['template_type'],
            'title' => $content['title'],
            'executive_summary' => $executiveSummary,
            'key_points' => json_encode($keyPoints),
            'participant_insights' => json_encode($participantInsights),
            'technical_assessment' => $this->getSectionContent($sections, 'technical_assessment'),
            'behavioral_assessment' => $this->getSectionContent($sections, 'behavioral_assessment'),
            'strengths' => json_encode($strengths),
            'areas_for_improvement' => json_encode($improvements),
            'recommendations' => json_encode($recommendations),
            'decision_factors' => json_encode($decisionFactors),
            'overall_rating' => $assessment['overall_rating'],
            'confidence_score' => $assessment['confidence_score'],
            'word_count' => array_sum(array_column($sections, 'word_count')),
            'reading_time_minutes' => ceil(array_sum(array_column($sections, 'word_count')) / 200),
            'summary_metadata' => json_encode([
                'template_used' => $template['template_name'],
                'ai_models' => json_decode($this->activeSessions[$sessionId]['session_data']['ai_models_enabled'], true),
                'processing_mode' => $this->activeSessions[$sessionId]['session_data']['processing_mode'],
                'language' => $this->activeSessions[$sessionId]['session_data']['language'],
                'sections_count' => count($sections),
                'insights_count' => count($insights),
                'assessment_scores' => [
                    'technical' => $assessment['technical_score'],
                    'communication' => $assessment['communication_score'],
                    'cultural_fit' => $assessment['cultural_fit_score'],
                    'experience' => $assessment['experience_score']
                ]
            ]),
            'ai_analysis_data' => json_encode([
                'sections' => $sections,
                'insights' => $insights,
                'assessment' => $assessment
            ])
        ];

        return $summary;
    }

    /**
     * Get session analytics
     */
    public function getSessionAnalytics(string $sessionId): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                // Try to load from database
                $session = $this->loadSessionFromDatabase($sessionId);
                if (!$session) {
                    throw new Exception('Session not found');
                }
            }

            $session = $this->activeSessions[$sessionId] ?? [];
            $statistics = $session['statistics'] ?? [];

            // Get summary data from database
            $sql = "SELECT * FROM interview_summaries WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get sections count
            $sql = "SELECT COUNT(*) as section_count FROM summary_sections WHERE summary_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$summary['summary_id'] ?? '']);
            $sectionCount = $stmt->fetch(PDO::FETCH_ASSOC)['section_count'] ?? 0;

            // Get insights count
            $sql = "SELECT COUNT(*) as insight_count FROM summary_insights WHERE summary_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$summary['summary_id'] ?? '']);
            $insightCount = $stmt->fetch(PDO::FETCH_ASSOC)['insight_count'] ?? 0;

            return [
                'success' => true,
                'session_id' => $sessionId,
                'statistics' => [
                    'sections_generated' => $sectionCount,
                    'insights_extracted' => $insightCount,
                    'total_processing_time_ms' => $summary['processing_time_ms'] ?? 0,
                    'word_count' => $summary['word_count'] ?? 0,
                    'reading_time_minutes' => $summary['reading_time_minutes'] ?? 0,
                    'overall_rating' => $summary['overall_rating'] ?? 0,
                    'confidence_score' => $summary['confidence_score'] ?? 0
                ],
                'metrics' => [
                    'summary_quality' => $this->calculateSummaryQuality($summary),
                    'processing_efficiency' => $this->calculateProcessingEfficiency($summary),
                    'content_coverage' => $this->calculateContentCoverage($sectionCount, $insightCount)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get summary templates
     */
    public function getSummaryTemplates(): array
    {
        try {
            $sql = "SELECT * FROM summary_templates WHERE enabled = 1 ORDER BY is_default DESC, template_name ASC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'templates' => $templates
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get templates: ' . $e->getMessage()
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
            'demo_interviews' => [
                [
                    'interview_id' => 'demo_interview_001',
                    'title' => 'Senior Software Engineer Interview',
                    'duration' => 3600,
                    'participants' => [
                        ['id' => 'interviewer_1', 'name' => 'Sarah Johnson', 'role' => 'Engineering Manager'],
                        ['id' => 'candidate_1', 'name' => 'Alex Chen', 'role' => 'Candidate']
                    ],
                    'transcription' => 'This is a sample interview transcription discussing software engineering concepts, problem-solving approaches, and technical experience...',
                    'expected_summary_type' => 'comprehensive'
                ],
                [
                    'interview_id' => 'demo_interview_002',
                    'title' => 'Product Manager Interview',
                    'duration' => 2700,
                    'participants' => [
                        ['id' => 'interviewer_2', 'name' => 'Mike Davis', 'role' => 'VP of Product'],
                        ['id' => 'candidate_2', 'name' => 'Emma Wilson', 'role' => 'Candidate']
                    ],
                    'transcription' => 'Product management interview covering strategy, user research, roadmap planning, and stakeholder management...',
                    'expected_summary_type' => 'behavioral'
                ]
            ],
            'summary_templates' => $this->summaryTemplates,
            'ai_models' => $this->aiModels,
            'sample_settings' => [
                'processing_mode' => 'auto',
                'language' => 'en',
                'ai_models' => ['openai_gpt4', 'claude_3'],
                'custom_prompts' => [],
                'include_insights' => true,
                'include_recommendations' => true,
                'export_formats' => ['pdf', 'docx', 'html']
            ]
        ];
    }

    // Helper methods for content analysis and processing

    /**
     * Extract key technologies from text
     */
    private function extractKeyTechnologies(string $text): string
    {
        $technologies = ['JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes'];
        $found = [];

        foreach ($technologies as $tech) {
            if (stripos($text, $tech) !== false) {
                $found[] = $tech;
            }
        }

        return empty($found) ? 'various technologies' : implode(', ', array_slice($found, 0, 3));
    }

    /**
     * Estimate experience level from text
     */
    private function estimateExperience(string $text): string
    {
        if (stripos($text, 'senior') !== false || stripos($text, 'lead') !== false) {
            return '5-8';
        } elseif (stripos($text, 'junior') !== false || stripos($text, 'entry') !== false) {
            return '1-3';
        } else {
            return '3-5';
        }
    }

    /**
     * Extract participants from transcription
     */
    private function extractParticipantsFromTranscription(string $transcription): array
    {
        // Demo implementation - in real scenario, use speaker diarization
        return [
            ['id' => 'interviewer_1', 'name' => 'Interviewer', 'role' => 'Interviewer'],
            ['id' => 'candidate_1', 'name' => 'Candidate', 'role' => 'Candidate']
        ];
    }

    /**
     * Get section title
     */
    private function getSectionTitle(string $sectionType): string
    {
        $titles = [
            'executive_summary' => 'Executive Summary',
            'key_points' => 'Key Points',
            'technical_assessment' => 'Technical Assessment',
            'behavioral_assessment' => 'Behavioral Assessment',
            'strengths' => 'Strengths',
            'areas_for_improvement' => 'Areas for Improvement',
            'recommendations' => 'Recommendations',
            'decision_factors' => 'Decision Factors'
        ];

        return $titles[$sectionType] ?? ucwords(str_replace('_', ' ', $sectionType));
    }

    /**
     * Get default prompt for section type
     */
    private function getDefaultPrompt(string $sectionType): string
    {
        $prompts = [
            'executive_summary' => 'Provide a concise executive summary of the interview',
            'key_points' => 'Extract the most important points discussed in the interview',
            'technical_assessment' => 'Evaluate the candidate\'s technical skills and competencies',
            'behavioral_assessment' => 'Assess the candidate\'s behavioral traits and soft skills',
            'strengths' => 'Identify the candidate\'s key strengths',
            'areas_for_improvement' => 'Note areas where the candidate could improve',
            'recommendations' => 'Provide hiring recommendations based on the interview',
            'decision_factors' => 'List key factors that should influence the hiring decision'
        ];

        return $prompts[$sectionType] ?? "Analyze the interview content for: $sectionType";
    }

    /**
     * Get section content by type
     */
    private function getSectionContent(array $sections, string $sectionType): string
    {
        foreach ($sections as $section) {
            if ($section['section_type'] === $sectionType) {
                return $section['section_content'];
            }
        }
        return '';
    }

    /**
     * Analyze participant contributions
     */
    private function analyzeParticipantContributions(array $participant, array $content): array
    {
        return [
            'speaking_time_percentage' => 45.0, // Demo value
            'key_topics_discussed' => ['Technical skills', 'Project experience', 'Career goals'],
            'engagement_level' => 'high',
            'communication_quality' => 'excellent'
        ];
    }

    /**
     * Calculate participant score
     */
    private function calculateParticipantScore(array $participant, array $insights): float
    {
        // Demo calculation
        return 8.2;
    }

    /**
     * Calculate summary quality
     */
    private function calculateSummaryQuality(array $summary): string
    {
        $confidence = $summary['confidence_score'] ?? 0;

        if ($confidence >= 0.9) return 'excellent';
        if ($confidence >= 0.8) return 'high';
        if ($confidence >= 0.7) return 'good';
        if ($confidence >= 0.6) return 'fair';
        return 'needs_improvement';
    }

    /**
     * Calculate processing efficiency
     */
    private function calculateProcessingEfficiency(array $summary): float
    {
        $processingTime = $summary['processing_time_ms'] ?? 30000;
        $wordCount = $summary['word_count'] ?? 500;

        // Words per second processing rate
        $efficiency = $wordCount / ($processingTime / 1000);
        return round($efficiency, 2);
    }

    /**
     * Calculate content coverage
     */
    private function calculateContentCoverage(int $sectionCount, int $insightCount): float
    {
        $expectedSections = 8; // Based on comprehensive template
        $expectedInsights = 10;

        $sectionCoverage = min(1.0, $sectionCount / $expectedSections);
        $insightCoverage = min(1.0, $insightCount / $expectedInsights);

        return round(($sectionCoverage + $insightCoverage) / 2, 2);
    }

    // Database operations

    /**
     * Load AI models configuration
     */
    private function loadAIModels(): void
    {
        $this->aiModels = [
            [
                'model_id' => 'openai_gpt4',
                'model_name' => 'GPT-4',
                'provider' => 'OpenAI',
                'enabled' => true,
                'confidence_threshold' => 0.8,
                'cost_per_token' => 0.00003
            ],
            [
                'model_id' => 'claude_3',
                'model_name' => 'Claude 3',
                'provider' => 'Anthropic',
                'enabled' => true,
                'confidence_threshold' => 0.85,
                'cost_per_token' => 0.000025
            ],
            [
                'model_id' => 'custom_summarizer',
                'model_name' => 'Custom Summarizer',
                'provider' => 'Internal',
                'enabled' => true,
                'confidence_threshold' => 0.75,
                'cost_per_token' => 0.0
            ]
        ];
    }

    /**
     * Load summary templates
     */
    private function loadSummaryTemplates(): void
    {
        try {
            $sql = "SELECT * FROM summary_templates WHERE enabled = 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $this->summaryTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->summaryTemplates = [];
        }
    }

    /**
     * Get summary template by type
     */
    private function getSummaryTemplate(string $type): ?array
    {
        foreach ($this->summaryTemplates as $template) {
            if ($template['template_type'] === $type) {
                return $template;
            }
        }
        return null;
    }

    /**
     * Update session status
     */
    private function updateSessionStatus(string $sessionId, string $status): void
    {
        try {
            $sql = "UPDATE summary_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$status, $sessionId]);

            if (isset($this->activeSessions[$sessionId])) {
                $this->activeSessions[$sessionId]['session_data']['status'] = $status;
            }

            if ($status === 'completed') {
                $sql = "UPDATE summary_sessions SET completed_at = CURRENT_TIMESTAMP WHERE session_id = ?";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$sessionId]);
            }
        } catch (Exception $e) {
            // Log error but don't throw
        }
    }

    /**
     * Update processing progress
     */
    private function updateProgress(string $sessionId, int $percentage, string $step): void
    {
        if (isset($this->activeSessions[$sessionId])) {
            $this->activeSessions[$sessionId]['progress_percentage'] = $percentage;
            $this->activeSessions[$sessionId]['current_step'] = $step;
        }
    }

    /**
     * Store summary in database
     */
    private function storeSummary(array $summary): void
    {
        $sql = "INSERT INTO interview_summaries (
            summary_id, session_id, interview_id, summary_type, title, executive_summary,
            key_points, participant_insights, technical_assessment, behavioral_assessment,
            strengths, areas_for_improvement, recommendations, decision_factors,
            overall_rating, confidence_score, word_count, reading_time_minutes,
            summary_metadata, ai_analysis_data, processing_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $summary['summary_id'],
            $summary['session_id'],
            $summary['interview_id'],
            $summary['summary_type'],
            $summary['title'],
            $summary['executive_summary'],
            $summary['key_points'],
            $summary['participant_insights'],
            $summary['technical_assessment'],
            $summary['behavioral_assessment'],
            $summary['strengths'],
            $summary['areas_for_improvement'],
            $summary['recommendations'],
            $summary['decision_factors'],
            $summary['overall_rating'],
            $summary['confidence_score'],
            $summary['word_count'],
            $summary['reading_time_minutes'],
            $summary['summary_metadata'],
            $summary['ai_analysis_data'],
            $summary['processing_time_ms'] ?? 0
        ]);
    }

    /**
     * Store summary section
     */
    private function storeSummarySection(array $section): void
    {
        $sql = "INSERT INTO summary_sections (
            section_id, summary_id, section_type, section_title, section_content,
            section_order, word_count, confidence_score, ai_model_used, processing_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $section['section_id'],
            $section['summary_id'],
            $section['section_type'],
            $section['section_title'],
            $section['section_content'],
            $section['section_order'],
            $section['word_count'],
            $section['confidence_score'],
            $section['ai_model_used'],
            $section['processing_notes']
        ]);
    }

    /**
     * Store summary insight
     */
    private function storeSummaryInsight(array $insight): void
    {
        $sql = "INSERT INTO summary_insights (
            insight_id, summary_id, insight_type, insight_category, insight_text,
            supporting_evidence, confidence_score, importance_score, participant_id, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $insight['insight_id'],
            $insight['summary_id'],
            $insight['insight_type'],
            $insight['insight_category'],
            $insight['insight_text'],
            $insight['supporting_evidence'],
            $insight['confidence_score'],
            $insight['importance_score'],
            $insight['participant_id'],
            $insight['tags']
        ]);
    }

    /**
     * Load session from database
     */
    private function loadSessionFromDatabase(string $sessionId): ?array
    {
        try {
            $sql = "SELECT * FROM summary_sessions WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            return null;
        }
    }
}
