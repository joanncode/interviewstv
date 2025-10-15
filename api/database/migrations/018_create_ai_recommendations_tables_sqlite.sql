-- AI-Powered Interview Recommendations System Tables
-- Migration: 018_create_ai_recommendations_tables_sqlite.sql

-- AI recommendation sessions
CREATE TABLE IF NOT EXISTS ai_recommendation_sessions (
    session_id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL DEFAULT 'comprehensive', -- comprehensive, interview_improvement, candidate_assessment, question_optimization, hiring_decision
    ai_models_enabled TEXT, -- JSON array of enabled AI models
    analysis_depth TEXT NOT NULL DEFAULT 'standard', -- quick, standard, deep, comprehensive
    focus_areas TEXT, -- JSON array of focus areas (communication, technical, leadership, etc.)
    industry_context TEXT, -- industry for context-aware recommendations
    role_context TEXT, -- specific role being interviewed for
    experience_level TEXT, -- junior, mid, senior, executive
    custom_criteria TEXT, -- JSON custom evaluation criteria
    recommendation_settings TEXT, -- JSON configuration
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    processing_start_time DATETIME,
    processing_end_time DATETIME,
    total_recommendations INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    recommendation_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    interview_id TEXT NOT NULL,
    category TEXT NOT NULL, -- interview_improvement, candidate_assessment, question_optimization, hiring_decision, follow_up_actions
    subcategory TEXT, -- communication, technical_skills, leadership, cultural_fit, etc.
    recommendation_type TEXT NOT NULL, -- suggestion, insight, warning, opportunity, action_item
    priority_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detailed_analysis TEXT, -- comprehensive analysis behind the recommendation
    supporting_evidence TEXT, -- JSON evidence supporting the recommendation
    confidence_score REAL DEFAULT 0.0, -- 0 to 1 confidence in recommendation
    impact_score REAL DEFAULT 0.0, -- potential impact if recommendation is followed
    effort_required TEXT DEFAULT 'medium', -- low, medium, high effort to implement
    timeline_suggestion TEXT, -- immediate, short_term, long_term
    actionable_steps TEXT, -- JSON array of specific steps to take
    success_metrics TEXT, -- JSON metrics to measure success
    related_data TEXT, -- JSON related interview data (timestamps, quotes, etc.)
    ai_model_used TEXT,
    processing_time_ms INTEGER DEFAULT 0,
    is_implemented BOOLEAN DEFAULT 0,
    implementation_feedback TEXT,
    effectiveness_rating INTEGER, -- 1-5 rating of recommendation effectiveness
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Interview improvement recommendations
CREATE TABLE IF NOT EXISTS interview_improvement_recommendations (
    improvement_id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    improvement_area TEXT NOT NULL, -- communication, structure, engagement, technical_depth, time_management
    current_performance_score REAL DEFAULT 0.0,
    target_performance_score REAL DEFAULT 0.0,
    improvement_potential REAL DEFAULT 0.0,
    specific_suggestions TEXT, -- JSON array of specific improvement suggestions
    best_practices TEXT, -- JSON best practices for this area
    common_mistakes TEXT, -- JSON common mistakes to avoid
    training_resources TEXT, -- JSON recommended training resources
    practice_exercises TEXT, -- JSON practice exercises
    measurement_criteria TEXT, -- JSON criteria to measure improvement
    estimated_improvement_time TEXT, -- time estimate for improvement
    difficulty_level TEXT DEFAULT 'medium', -- easy, medium, hard
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(recommendation_id),
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Candidate assessment recommendations
CREATE TABLE IF NOT EXISTS candidate_assessment_recommendations (
    assessment_id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    assessment_category TEXT NOT NULL, -- technical_skills, soft_skills, cultural_fit, leadership, problem_solving
    overall_score REAL DEFAULT 0.0, -- 0 to 10 overall assessment score
    strengths TEXT, -- JSON array of candidate strengths
    weaknesses TEXT, -- JSON array of areas for improvement
    skill_assessments TEXT, -- JSON detailed skill assessments
    behavioral_insights TEXT, -- JSON behavioral analysis
    cultural_fit_analysis TEXT, -- JSON cultural fit assessment
    growth_potential TEXT, -- JSON growth potential analysis
    risk_factors TEXT, -- JSON potential risk factors
    interview_performance_summary TEXT,
    comparison_to_role_requirements TEXT, -- JSON comparison analysis
    hiring_recommendation TEXT NOT NULL, -- strong_hire, hire, no_hire, strong_no_hire
    hiring_confidence REAL DEFAULT 0.0,
    salary_recommendation TEXT, -- JSON salary range recommendation
    onboarding_suggestions TEXT, -- JSON onboarding recommendations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(recommendation_id),
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Question optimization recommendations
CREATE TABLE IF NOT EXISTS question_optimization_recommendations (
    optimization_id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    question_category TEXT NOT NULL, -- technical, behavioral, situational, cultural_fit
    current_questions TEXT, -- JSON current questions used
    optimized_questions TEXT, -- JSON recommended optimized questions
    question_effectiveness_scores TEXT, -- JSON effectiveness scores for each question
    missing_question_areas TEXT, -- JSON areas not covered by current questions
    suggested_new_questions TEXT, -- JSON new questions to add
    question_sequencing_advice TEXT, -- JSON advice on question order
    time_allocation_suggestions TEXT, -- JSON time allocation per question type
    follow_up_question_strategies TEXT, -- JSON follow-up question strategies
    difficulty_progression TEXT, -- JSON difficulty progression recommendations
    industry_specific_questions TEXT, -- JSON industry-specific question suggestions
    role_specific_questions TEXT, -- JSON role-specific question suggestions
    bias_mitigation_suggestions TEXT, -- JSON suggestions to reduce bias
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(recommendation_id),
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Hiring decision recommendations
CREATE TABLE IF NOT EXISTS hiring_decision_recommendations (
    decision_id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    final_recommendation TEXT NOT NULL, -- hire, no_hire, additional_interview, reference_check
    confidence_level REAL DEFAULT 0.0, -- confidence in the hiring decision
    decision_factors TEXT, -- JSON factors influencing the decision
    risk_assessment TEXT, -- JSON risk analysis
    success_probability REAL DEFAULT 0.0, -- probability of candidate success
    cultural_fit_score REAL DEFAULT 0.0,
    technical_competency_score REAL DEFAULT 0.0,
    leadership_potential_score REAL DEFAULT 0.0,
    growth_mindset_score REAL DEFAULT 0.0,
    team_collaboration_score REAL DEFAULT 0.0,
    compensation_recommendation TEXT, -- JSON compensation package recommendation
    start_date_recommendation TEXT,
    probation_period_suggestions TEXT, -- JSON probation period recommendations
    development_plan_suggestions TEXT, -- JSON initial development plan
    team_placement_recommendations TEXT, -- JSON team placement suggestions
    success_metrics_definition TEXT, -- JSON success metrics for first 90 days
    potential_challenges TEXT, -- JSON potential challenges and mitigation strategies
    reference_check_focus_areas TEXT, -- JSON areas to focus on in reference checks
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(recommendation_id),
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- AI recommendation models and configuration
CREATE TABLE IF NOT EXISTS ai_recommendation_models (
    model_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL, -- openai, azure, aws, google, custom
    model_version TEXT,
    specialization TEXT, -- interview_analysis, candidate_assessment, question_optimization, hiring_decisions
    capabilities TEXT, -- JSON array of capabilities
    accuracy_rating REAL DEFAULT 0.0,
    processing_speed_ms REAL DEFAULT 0.0,
    cost_per_recommendation REAL DEFAULT 0.0,
    industry_expertise TEXT, -- JSON industries this model specializes in
    role_expertise TEXT, -- JSON roles this model specializes in
    recommendation_types TEXT, -- JSON types of recommendations this model can generate
    confidence_threshold REAL DEFAULT 0.7,
    enabled BOOLEAN DEFAULT 1,
    configuration TEXT, -- JSON model-specific configuration
    performance_metrics TEXT, -- JSON performance data
    training_data_info TEXT, -- JSON information about training data
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation feedback and effectiveness tracking
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    feedback_id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    feedback_type TEXT NOT NULL, -- usefulness, accuracy, actionability, relevance
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    actionability_rating INTEGER CHECK (actionability_rating >= 1 AND actionability_rating <= 5),
    relevance_rating INTEGER CHECK (relevance_rating >= 1 AND relevance_rating <= 5),
    implementation_status TEXT, -- not_implemented, partially_implemented, fully_implemented
    implementation_results TEXT, -- JSON results of implementing the recommendation
    improvement_suggestions TEXT,
    would_recommend_to_others BOOLEAN,
    additional_comments TEXT,
    follow_up_needed BOOLEAN DEFAULT 0,
    follow_up_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(recommendation_id),
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Recommendation analytics and reporting
CREATE TABLE IF NOT EXISTS recommendation_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT,
    date_period TEXT NOT NULL, -- daily, weekly, monthly
    total_recommendations INTEGER DEFAULT 0,
    recommendations_by_category TEXT, -- JSON breakdown by category
    avg_confidence_score REAL DEFAULT 0.0,
    avg_impact_score REAL DEFAULT 0.0,
    implementation_rate REAL DEFAULT 0.0, -- percentage of recommendations implemented
    effectiveness_score REAL DEFAULT 0.0, -- average effectiveness rating
    user_satisfaction_score REAL DEFAULT 0.0,
    processing_performance TEXT, -- JSON processing time and efficiency metrics
    model_performance_comparison TEXT, -- JSON comparison of different AI models
    recommendation_trends TEXT, -- JSON trending recommendation types
    success_stories TEXT, -- JSON successful recommendation implementations
    improvement_opportunities TEXT, -- JSON areas for system improvement
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ai_recommendation_sessions(session_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_sessions_interview ON ai_recommendation_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_sessions_user ON ai_recommendation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_sessions_status ON ai_recommendation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_sessions_type ON ai_recommendation_sessions(recommendation_type);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_session ON ai_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_interview ON ai_recommendations(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_category ON ai_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority_level);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_confidence ON ai_recommendations(confidence_score);

CREATE INDEX IF NOT EXISTS idx_interview_improvement_session ON interview_improvement_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_improvement_area ON interview_improvement_recommendations(improvement_area);

CREATE INDEX IF NOT EXISTS idx_candidate_assessment_session ON candidate_assessment_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_candidate_assessment_category ON candidate_assessment_recommendations(assessment_category);
CREATE INDEX IF NOT EXISTS idx_candidate_assessment_score ON candidate_assessment_recommendations(overall_score);

CREATE INDEX IF NOT EXISTS idx_question_optimization_session ON question_optimization_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_question_optimization_category ON question_optimization_recommendations(question_category);

CREATE INDEX IF NOT EXISTS idx_hiring_decision_session ON hiring_decision_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_hiring_decision_recommendation ON hiring_decision_recommendations(final_recommendation);
CREATE INDEX IF NOT EXISTS idx_hiring_decision_confidence ON hiring_decision_recommendations(confidence_level);

CREATE INDEX IF NOT EXISTS idx_ai_recommendation_models_provider ON ai_recommendation_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_models_specialization ON ai_recommendation_models(specialization);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_models_enabled ON ai_recommendation_models(enabled);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_session ON recommendation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON recommendation_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_session ON recommendation_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_period ON recommendation_analytics(date_period);

-- Insert default AI recommendation models
INSERT OR IGNORE INTO ai_recommendation_models (model_id, model_name, provider, specialization, capabilities, accuracy_rating, processing_speed_ms, industry_expertise, role_expertise, enabled) VALUES
('openai_gpt4_interview_advisor', 'GPT-4 Interview Advisor', 'openai', 'interview_analysis', '["interview_improvement", "candidate_assessment", "question_optimization", "hiring_decisions"]', 0.92, 2000, '["technology", "finance", "healthcare", "consulting", "startup"]', '["software_engineer", "product_manager", "data_scientist", "marketing", "sales", "executive"]', 1),

('azure_interview_insights', 'Azure Interview Insights', 'azure', 'candidate_assessment', '["candidate_assessment", "cultural_fit", "skill_analysis"]', 0.88, 1500, '["enterprise", "government", "healthcare", "finance"]', '["technical", "management", "analyst", "consultant"]', 1),

('aws_hiring_intelligence', 'AWS Hiring Intelligence', 'aws', 'hiring_decisions', '["hiring_decisions", "risk_assessment", "success_prediction"]', 0.85, 1200, '["technology", "cloud", "enterprise", "startup"]', '["cloud_engineer", "devops", "architect", "technical_lead"]', 1),

('google_question_optimizer', 'Google Question Optimizer', 'google', 'question_optimization', '["question_optimization", "bias_detection", "interview_structure"]', 0.90, 1000, '["technology", "research", "education", "consulting"]', '["researcher", "engineer", "analyst", "product_manager"]', 1),

('custom_interview_coach', 'Custom Interview Coach', 'custom', 'interview_improvement', '["interview_improvement", "communication_analysis", "performance_coaching"]', 0.82, 800, '["general"]', '["all_roles"]', 1);

-- Insert sample recommendation session for demo
INSERT OR IGNORE INTO ai_recommendation_sessions (session_id, interview_id, user_id, recommendation_type, status) VALUES
('demo_recommendation_session', 'demo_interview_001', 1, 'comprehensive', 'completed');
