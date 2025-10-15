-- Automated Interview Summaries System Tables
-- Migration: 016_create_automated_summaries_tables_sqlite.sql

-- Interview summary sessions
CREATE TABLE IF NOT EXISTS summary_sessions (
    session_id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    summary_type TEXT NOT NULL DEFAULT 'comprehensive', -- comprehensive, executive, technical, behavioral, custom
    ai_models_enabled TEXT, -- JSON array of enabled AI models
    processing_mode TEXT NOT NULL DEFAULT 'auto', -- auto, manual, hybrid
    language TEXT NOT NULL DEFAULT 'en',
    custom_prompts TEXT, -- JSON custom prompts for different sections
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    settings TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Generated summaries
CREATE TABLE IF NOT EXISTS interview_summaries (
    summary_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    interview_id TEXT NOT NULL,
    summary_type TEXT NOT NULL,
    title TEXT NOT NULL,
    executive_summary TEXT,
    key_points TEXT, -- JSON array of key points
    participant_insights TEXT, -- JSON insights about each participant
    technical_assessment TEXT,
    behavioral_assessment TEXT,
    strengths TEXT, -- JSON array of strengths
    areas_for_improvement TEXT, -- JSON array of improvement areas
    recommendations TEXT, -- JSON array of recommendations
    decision_factors TEXT, -- JSON factors for hiring decision
    overall_rating REAL DEFAULT 0.0,
    confidence_score REAL DEFAULT 0.0,
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    summary_metadata TEXT, -- JSON additional metadata
    ai_analysis_data TEXT, -- JSON raw AI analysis data
    processing_time_ms INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES summary_sessions(session_id)
);

-- Summary sections and components
CREATE TABLE IF NOT EXISTS summary_sections (
    section_id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    section_type TEXT NOT NULL, -- overview, key_points, technical, behavioral, recommendations, etc.
    section_title TEXT NOT NULL,
    section_content TEXT NOT NULL,
    section_order INTEGER DEFAULT 1,
    word_count INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 0.0,
    ai_model_used TEXT,
    processing_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES interview_summaries(summary_id)
);

-- Key insights and highlights
CREATE TABLE IF NOT EXISTS summary_insights (
    insight_id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    insight_type TEXT NOT NULL, -- strength, weakness, skill, experience, concern, recommendation
    insight_category TEXT, -- technical, behavioral, communication, leadership, etc.
    insight_text TEXT NOT NULL,
    supporting_evidence TEXT, -- JSON quotes and timestamps
    confidence_score REAL DEFAULT 0.0,
    importance_score REAL DEFAULT 0.0,
    participant_id TEXT, -- which participant this insight relates to
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES interview_summaries(summary_id)
);

-- Summary templates and formats
CREATE TABLE IF NOT EXISTS summary_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- comprehensive, executive, technical, behavioral, custom
    description TEXT,
    sections TEXT NOT NULL, -- JSON array of section definitions
    prompts TEXT NOT NULL, -- JSON AI prompts for each section
    formatting_rules TEXT, -- JSON formatting and style rules
    target_word_count INTEGER DEFAULT 500,
    target_reading_time INTEGER DEFAULT 3,
    industry_focus TEXT, -- JSON array of industries this template is optimized for
    role_focus TEXT, -- JSON array of roles this template is optimized for
    enabled BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Summary feedback and ratings
CREATE TABLE IF NOT EXISTS summary_feedback (
    feedback_id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    completeness_rating INTEGER CHECK (completeness_rating >= 1 AND completeness_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    feedback_text TEXT,
    suggested_improvements TEXT,
    would_recommend BOOLEAN DEFAULT 1,
    feedback_metadata TEXT, -- JSON additional feedback data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES interview_summaries(summary_id)
);

-- Summary analytics and performance
CREATE TABLE IF NOT EXISTS summary_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT,
    summary_id TEXT,
    date_period TEXT NOT NULL, -- daily, weekly, monthly
    total_summaries_generated INTEGER DEFAULT 0,
    avg_processing_time_ms REAL DEFAULT 0.0,
    avg_word_count REAL DEFAULT 0.0,
    avg_confidence_score REAL DEFAULT 0.0,
    avg_user_rating REAL DEFAULT 0.0,
    most_used_template TEXT,
    most_requested_type TEXT,
    success_rate REAL DEFAULT 0.0,
    error_rate REAL DEFAULT 0.0,
    performance_metrics TEXT, -- JSON detailed metrics
    cost_analysis TEXT, -- JSON cost breakdown
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES summary_sessions(session_id),
    FOREIGN KEY (summary_id) REFERENCES interview_summaries(summary_id)
);

-- Summary exports and sharing
CREATE TABLE IF NOT EXISTS summary_exports (
    export_id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL,
    export_format TEXT NOT NULL, -- pdf, docx, html, json, markdown
    export_template TEXT, -- template used for export
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    shared_with TEXT, -- JSON array of users/emails shared with
    access_level TEXT DEFAULT 'private', -- private, internal, public
    expires_at DATETIME,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME,
    FOREIGN KEY (summary_id) REFERENCES interview_summaries(summary_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_summary_sessions_interview ON summary_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_summary_sessions_user ON summary_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_summary_sessions_status ON summary_sessions(status);
CREATE INDEX IF NOT EXISTS idx_summary_sessions_type ON summary_sessions(summary_type);

CREATE INDEX IF NOT EXISTS idx_interview_summaries_session ON interview_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_summaries_interview ON interview_summaries(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_summaries_type ON interview_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_interview_summaries_rating ON interview_summaries(overall_rating);

CREATE INDEX IF NOT EXISTS idx_summary_sections_summary ON summary_sections(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_sections_type ON summary_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_summary_sections_order ON summary_sections(section_order);

CREATE INDEX IF NOT EXISTS idx_summary_insights_summary ON summary_insights(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_insights_type ON summary_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_summary_insights_category ON summary_insights(insight_category);
CREATE INDEX IF NOT EXISTS idx_summary_insights_importance ON summary_insights(importance_score);

CREATE INDEX IF NOT EXISTS idx_summary_templates_type ON summary_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_summary_templates_enabled ON summary_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_summary_templates_default ON summary_templates(is_default);

CREATE INDEX IF NOT EXISTS idx_summary_feedback_summary ON summary_feedback(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_feedback_user ON summary_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_summary_feedback_rating ON summary_feedback(rating);

CREATE INDEX IF NOT EXISTS idx_summary_analytics_session ON summary_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_summary_analytics_period ON summary_analytics(date_period);

CREATE INDEX IF NOT EXISTS idx_summary_exports_summary ON summary_exports(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_exports_format ON summary_exports(export_format);
CREATE INDEX IF NOT EXISTS idx_summary_exports_created_by ON summary_exports(created_by);

-- Insert default summary templates
INSERT OR IGNORE INTO summary_templates (template_id, template_name, template_type, description, sections, prompts, target_word_count, target_reading_time, is_default) VALUES
('comprehensive_default', 'Comprehensive Interview Summary', 'comprehensive', 'Complete interview analysis with all key aspects covered',
 '["executive_summary", "key_points", "technical_assessment", "behavioral_assessment", "strengths", "areas_for_improvement", "recommendations", "decision_factors"]',
 '{"executive_summary": "Provide a concise executive summary of the interview", "key_points": "Extract the most important points discussed", "technical_assessment": "Evaluate technical skills and competencies", "behavioral_assessment": "Assess behavioral traits and soft skills", "strengths": "Identify candidate strengths", "areas_for_improvement": "Note areas needing improvement", "recommendations": "Provide hiring recommendations", "decision_factors": "List key factors for decision making"}',
 800, 5, 1),

('executive_default', 'Executive Summary', 'executive', 'Brief high-level summary for executives and decision makers',
 '["executive_summary", "key_highlights", "recommendation", "rating"]',
 '{"executive_summary": "Provide a brief executive summary", "key_highlights": "List 3-5 key highlights", "recommendation": "Provide clear hiring recommendation", "rating": "Give overall candidate rating"}',
 300, 2, 1),

('technical_default', 'Technical Assessment', 'technical', 'Focused technical skills evaluation',
 '["technical_overview", "skills_assessment", "problem_solving", "experience_evaluation", "technical_recommendations"]',
 '{"technical_overview": "Overview of technical discussion", "skills_assessment": "Detailed skills evaluation", "problem_solving": "Problem-solving approach analysis", "experience_evaluation": "Technical experience assessment", "technical_recommendations": "Technical hiring recommendations"}',
 600, 4, 1),

('behavioral_default', 'Behavioral Assessment', 'behavioral', 'Comprehensive behavioral and soft skills evaluation',
 '["behavioral_overview", "communication_skills", "leadership_potential", "teamwork_abilities", "cultural_fit", "behavioral_recommendations"]',
 '{"behavioral_overview": "Overview of behavioral assessment", "communication_skills": "Communication effectiveness evaluation", "leadership_potential": "Leadership qualities assessment", "teamwork_abilities": "Collaboration and teamwork skills", "cultural_fit": "Cultural fit evaluation", "behavioral_recommendations": "Behavioral hiring recommendations"}',
 500, 3, 1);

-- Insert sample summary session for demo
INSERT OR IGNORE INTO summary_sessions (session_id, interview_id, user_id, summary_type, ai_models_enabled, status) VALUES
('demo_summary_session', 'demo_interview_001', 1, 'comprehensive', '["openai_gpt4", "claude_3", "custom_summarizer"]', 'completed');
