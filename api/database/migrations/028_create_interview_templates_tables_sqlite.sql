-- Interview Templates Database Schema
-- Creates comprehensive tables for interview template management

-- Interview template categories
CREATE TABLE IF NOT EXISTS interview_template_categories (
    category_id TEXT PRIMARY KEY,
    category_name TEXT NOT NULL,
    description TEXT,
    icon_class TEXT DEFAULT 'fas fa-folder',
    color_code TEXT DEFAULT '#007bff',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Main interview templates table
CREATE TABLE IF NOT EXISTS interview_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    template_type TEXT DEFAULT 'standard', -- standard, behavioral, technical, custom
    difficulty_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
    estimated_duration INTEGER DEFAULT 60, -- in minutes
    industry TEXT,
    job_role TEXT,
    skills_assessed TEXT, -- JSON array of skills
    is_public BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    created_by TEXT,
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    tags TEXT, -- JSON array of tags
    metadata TEXT, -- JSON for additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES interview_template_categories(category_id)
);

-- Interview questions within templates
CREATE TABLE IF NOT EXISTS interview_template_questions (
    question_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'open_ended', -- open_ended, multiple_choice, coding, behavioral, technical
    category TEXT, -- technical, behavioral, cultural_fit, problem_solving
    difficulty_level TEXT DEFAULT 'intermediate',
    estimated_time INTEGER DEFAULT 5, -- in minutes
    expected_answer TEXT,
    evaluation_criteria TEXT, -- JSON array of criteria
    follow_up_questions TEXT, -- JSON array of follow-up questions
    code_snippet TEXT, -- for coding questions
    programming_language TEXT, -- for coding questions
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT 1,
    points_possible INTEGER DEFAULT 10,
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id) ON DELETE CASCADE
);

-- Template usage analytics
CREATE TABLE IF NOT EXISTS interview_template_usage (
    usage_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT,
    interview_id TEXT,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    questions_asked INTEGER,
    questions_completed INTEGER,
    completion_rate DECIMAL(5,2),
    user_rating INTEGER, -- 1-5 stars
    feedback TEXT,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id)
);

-- Template ratings and reviews
CREATE TABLE IF NOT EXISTS interview_template_ratings (
    rating_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title TEXT,
    review_text TEXT,
    is_verified BOOLEAN DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id)
);

-- Template sharing and collaboration
CREATE TABLE IF NOT EXISTS interview_template_shares (
    share_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    shared_with TEXT, -- user_id or email
    share_type TEXT DEFAULT 'view', -- view, edit, copy
    access_level TEXT DEFAULT 'read_only', -- read_only, read_write, admin
    share_token TEXT UNIQUE,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id)
);

-- Template versions for change tracking
CREATE TABLE IF NOT EXISTS interview_template_versions (
    version_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    version_number TEXT NOT NULL,
    version_name TEXT,
    changes_description TEXT,
    template_data TEXT NOT NULL, -- JSON snapshot of template
    created_by TEXT,
    is_current BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id)
);

-- Template performance analytics
CREATE TABLE IF NOT EXISTS interview_template_analytics (
    analytics_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    uses_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_duration_minutes INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    unique_users INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00, -- views to uses
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES interview_templates(template_id),
    UNIQUE(template_id, date)
);

-- Insert sample template categories
INSERT OR IGNORE INTO interview_template_categories (category_id, category_name, description, icon_class, color_code, sort_order) VALUES
('tech_general', 'Technical - General', 'General technical interview questions for software developers', 'fas fa-code', '#007bff', 1),
('tech_frontend', 'Technical - Frontend', 'Frontend development specific questions (React, Vue, Angular)', 'fab fa-js-square', '#f7df1e', 2),
('tech_backend', 'Technical - Backend', 'Backend development questions (APIs, databases, architecture)', 'fas fa-server', '#28a745', 3),
('tech_devops', 'Technical - DevOps', 'DevOps and infrastructure questions', 'fas fa-cogs', '#6f42c1', 4),
('behavioral', 'Behavioral', 'Behavioral and soft skills assessment questions', 'fas fa-users', '#fd7e14', 5),
('leadership', 'Leadership', 'Leadership and management assessment questions', 'fas fa-crown', '#dc3545', 6),
('sales', 'Sales & Marketing', 'Sales, marketing, and business development questions', 'fas fa-chart-line', '#20c997', 7),
('design', 'Design & UX', 'Design thinking and user experience questions', 'fas fa-palette', '#e83e8c', 8);

-- Insert sample interview templates
INSERT OR IGNORE INTO interview_templates (template_id, template_name, description, category_id, template_type, difficulty_level, estimated_duration, industry, job_role, skills_assessed, is_featured, tags) VALUES
('template_js_fullstack', 'Full-Stack JavaScript Developer', 'Comprehensive template for full-stack JavaScript developers covering frontend, backend, and system design', 'tech_general', 'technical', 'intermediate', 90, 'Technology', 'Full-Stack Developer', '["JavaScript", "Node.js", "React", "Express", "MongoDB", "System Design"]', 1, '["javascript", "fullstack", "react", "nodejs", "popular"]'),
('template_react_frontend', 'React Frontend Developer', 'Specialized template for React frontend developers with modern practices', 'tech_frontend', 'technical', 'intermediate', 75, 'Technology', 'Frontend Developer', '["React", "JavaScript", "CSS", "HTML", "Redux", "Testing"]', 1, '["react", "frontend", "javascript", "redux"]'),
('template_python_backend', 'Python Backend Developer', 'Backend-focused template for Python developers using Django/Flask', 'tech_backend', 'technical', 'advanced', 80, 'Technology', 'Backend Developer', '["Python", "Django", "Flask", "PostgreSQL", "REST APIs", "Testing"]', 1, '["python", "backend", "django", "flask", "api"]'),
('template_devops_engineer', 'DevOps Engineer', 'Infrastructure and deployment focused template for DevOps roles', 'tech_devops', 'technical', 'advanced', 85, 'Technology', 'DevOps Engineer', '["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Monitoring"]', 1, '["devops", "kubernetes", "aws", "docker", "cicd"]'),
('template_behavioral_general', 'General Behavioral Assessment', 'Standard behavioral interview template for assessing soft skills and cultural fit', 'behavioral', 'behavioral', 'beginner', 45, 'General', 'Any Role', '["Communication", "Teamwork", "Problem Solving", "Leadership", "Adaptability"]', 1, '["behavioral", "soft-skills", "culture-fit", "general"]'),
('template_leadership_manager', 'Engineering Manager', 'Leadership-focused template for engineering management positions', 'leadership', 'behavioral', 'advanced', 60, 'Technology', 'Engineering Manager', '["Leadership", "Team Management", "Technical Strategy", "Communication", "Mentoring"]', 1, '["leadership", "management", "engineering", "strategy"]'),
('template_sales_rep', 'Sales Representative', 'Sales-focused template for assessing sales skills and customer relationship management', 'sales', 'behavioral', 'intermediate', 50, 'Sales', 'Sales Representative', '["Sales Process", "Customer Relations", "Negotiation", "Communication", "CRM"]', 0, '["sales", "customer-relations", "negotiation"]'),
('template_ux_designer', 'UX/UI Designer', 'Design-focused template for UX/UI designers covering design thinking and user research', 'design', 'technical', 'intermediate', 70, 'Design', 'UX/UI Designer', '["Design Thinking", "User Research", "Prototyping", "Figma", "Usability Testing"]', 1, '["ux", "ui", "design", "figma", "user-research"]');

-- Insert sample questions for Full-Stack JavaScript template
INSERT OR IGNORE INTO interview_template_questions (question_id, template_id, question_text, question_type, category, difficulty_level, estimated_time, expected_answer, evaluation_criteria, sort_order, points_possible) VALUES
('q_js_1', 'template_js_fullstack', 'Explain the difference between var, let, and const in JavaScript. When would you use each?', 'open_ended', 'technical', 'beginner', 5, 'var: function-scoped, hoisted, can be redeclared; let: block-scoped, hoisted but not initialized, cannot be redeclared; const: block-scoped, must be initialized, cannot be reassigned', '["Understanding of scope", "Knowledge of hoisting", "Practical usage examples"]', 1, 10),
('q_js_2', 'template_js_fullstack', 'How does the event loop work in Node.js? Explain with an example.', 'open_ended', 'technical', 'intermediate', 8, 'Event loop handles asynchronous operations, phases include timers, pending callbacks, poll, check, close callbacks', '["Understanding of asynchronous programming", "Knowledge of event loop phases", "Practical examples"]', 2, 15),
('q_js_3', 'template_js_fullstack', 'Design a REST API for a simple blog application. What endpoints would you create?', 'open_ended', 'technical', 'intermediate', 10, 'GET /posts, POST /posts, GET /posts/:id, PUT /posts/:id, DELETE /posts/:id, plus user authentication endpoints', '["RESTful design principles", "HTTP methods understanding", "Resource modeling"]', 3, 15),
('q_js_4', 'template_js_fullstack', 'Implement a function that debounces another function. Explain when you would use this.', 'coding', 'technical', 'intermediate', 12, 'Function that delays execution until after a specified time has passed since last invocation', '["Understanding of closures", "Practical implementation", "Use case knowledge"]', 4, 20),
('q_js_5', 'template_js_fullstack', 'How would you handle state management in a large React application?', 'open_ended', 'technical', 'advanced', 10, 'Context API for simple state, Redux/Zustand for complex state, local state for component-specific data', '["State management patterns", "Tool selection reasoning", "Scalability considerations"]', 5, 15);

-- Insert sample questions for Behavioral template
INSERT OR IGNORE INTO interview_template_questions (question_id, template_id, question_text, question_type, category, difficulty_level, estimated_time, expected_answer, evaluation_criteria, sort_order, points_possible) VALUES
('q_beh_1', 'template_behavioral_general', 'Tell me about a time when you had to work with a difficult team member. How did you handle the situation?', 'behavioral', 'behavioral', 'intermediate', 8, 'STAR method response showing conflict resolution, communication skills, and professional approach', '["Conflict resolution", "Communication skills", "Professional approach", "Team collaboration"]', 1, 15),
('q_beh_2', 'template_behavioral_general', 'Describe a situation where you had to learn something new quickly. What was your approach?', 'behavioral', 'behavioral', 'beginner', 6, 'Shows learning agility, resourcefulness, and ability to adapt to new challenges', '["Learning agility", "Resourcefulness", "Adaptability", "Problem-solving approach"]', 2, 10),
('q_beh_3', 'template_behavioral_general', 'Give me an example of a time when you had to make a decision with incomplete information.', 'behavioral', 'behavioral', 'intermediate', 7, 'Demonstrates decision-making process, risk assessment, and ability to work under uncertainty', '["Decision-making process", "Risk assessment", "Working under uncertainty", "Analytical thinking"]', 3, 15),
('q_beh_4', 'template_behavioral_general', 'Tell me about a project you are particularly proud of. What made it successful?', 'behavioral', 'behavioral', 'beginner', 8, 'Shows passion, ownership, understanding of success factors, and ability to reflect on achievements', '["Passion and ownership", "Success factor analysis", "Self-reflection", "Achievement orientation"]', 4, 10),
('q_beh_5', 'template_behavioral_general', 'Describe a time when you received constructive feedback. How did you respond?', 'behavioral', 'behavioral', 'intermediate', 6, 'Shows growth mindset, ability to receive feedback positively, and commitment to improvement', '["Growth mindset", "Feedback receptivity", "Continuous improvement", "Self-awareness"]', 5, 10);

-- Insert sample analytics data
INSERT OR IGNORE INTO interview_template_analytics (analytics_id, template_id, date, views_count, uses_count, downloads_count, shares_count, average_completion_rate, average_duration_minutes, average_rating, unique_users, conversion_rate) VALUES
('analytics_1', 'template_js_fullstack', '2024-01-15', 245, 89, 34, 12, 87.5, 85, 4.3, 89, 36.3),
('analytics_2', 'template_react_frontend', '2024-01-15', 189, 67, 28, 8, 92.1, 72, 4.5, 67, 35.4),
('analytics_3', 'template_behavioral_general', '2024-01-15', 156, 78, 45, 15, 94.2, 43, 4.2, 78, 50.0),
('analytics_4', 'template_python_backend', '2024-01-15', 134, 45, 19, 6, 89.3, 78, 4.1, 45, 33.6),
('analytics_5', 'template_devops_engineer', '2024-01-15', 98, 32, 14, 4, 85.7, 82, 4.4, 32, 32.7);
