-- Developer SDK Management Tables
-- Migration: 027_create_developer_sdk_tables_sqlite.sql
-- Description: Create tables for SDK management, downloads, usage tracking, and developer tools

-- SDK Versions and Releases
CREATE TABLE IF NOT EXISTS sdk_versions (
    version_id VARCHAR(50) PRIMARY KEY,
    version_number VARCHAR(20) NOT NULL,
    language VARCHAR(50) NOT NULL, -- 'javascript', 'python', 'php', 'java', 'csharp', 'ruby', 'go'
    release_type VARCHAR(20) DEFAULT 'stable', -- 'alpha', 'beta', 'rc', 'stable'
    release_notes TEXT,
    changelog TEXT,
    download_url VARCHAR(500),
    documentation_url VARCHAR(500),
    github_url VARCHAR(500),
    npm_package VARCHAR(100),
    pypi_package VARCHAR(100),
    composer_package VARCHAR(100),
    maven_coordinates VARCHAR(200),
    nuget_package VARCHAR(100),
    gem_name VARCHAR(100),
    go_module VARCHAR(200),
    file_size_bytes INTEGER,
    checksum_sha256 VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    min_api_version VARCHAR(20),
    max_api_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SDK Downloads Tracking
CREATE TABLE IF NOT EXISTS sdk_downloads (
    download_id VARCHAR(50) PRIMARY KEY,
    version_id VARCHAR(50) NOT NULL,
    user_id INTEGER,
    download_type VARCHAR(50), -- 'direct', 'npm', 'pip', 'composer', 'maven', 'nuget', 'gem', 'go'
    user_agent TEXT,
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    referrer_url TEXT,
    download_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES sdk_versions(version_id) ON DELETE CASCADE
);

-- SDK Usage Analytics
CREATE TABLE IF NOT EXISTS sdk_usage_analytics (
    usage_id VARCHAR(50) PRIMARY KEY,
    version_id VARCHAR(50) NOT NULL,
    user_id INTEGER,
    api_key_id VARCHAR(50),
    sdk_instance_id VARCHAR(100), -- Unique identifier for SDK instance
    method_called VARCHAR(100),
    endpoint_used VARCHAR(255),
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    sdk_version_reported VARCHAR(20),
    platform_info TEXT, -- JSON with OS, runtime version, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES sdk_versions(version_id) ON DELETE CASCADE
);

-- SDK Code Examples
CREATE TABLE IF NOT EXISTS sdk_code_examples (
    example_id VARCHAR(50) PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    category VARCHAR(100), -- 'authentication', 'calendar', 'streaming', 'webhooks', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    code_snippet TEXT NOT NULL,
    dependencies TEXT, -- JSON array of required packages
    complexity_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    tags TEXT, -- JSON array of tags
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SDK Documentation Pages
CREATE TABLE IF NOT EXISTS sdk_documentation (
    doc_id VARCHAR(50) PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    section VARCHAR(100), -- 'getting-started', 'authentication', 'api-reference', 'examples'
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html'
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    last_updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SDK Feedback and Issues
CREATE TABLE IF NOT EXISTS sdk_feedback (
    feedback_id VARCHAR(50) PRIMARY KEY,
    version_id VARCHAR(50),
    user_id INTEGER,
    feedback_type VARCHAR(50), -- 'bug', 'feature_request', 'improvement', 'question'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    language VARCHAR(50),
    sdk_version VARCHAR(20),
    environment_info TEXT, -- JSON with system details
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    workaround TEXT,
    resolution TEXT,
    assigned_to INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES sdk_versions(version_id) ON DELETE SET NULL
);

-- SDK Integration Examples
CREATE TABLE IF NOT EXISTS sdk_integrations (
    integration_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    framework VARCHAR(100), -- 'react', 'vue', 'angular', 'django', 'laravel', 'spring', etc.
    category VARCHAR(100), -- 'web-app', 'mobile-app', 'backend-service', 'microservice'
    github_url VARCHAR(500),
    demo_url VARCHAR(500),
    screenshot_url VARCHAR(500),
    complexity_level VARCHAR(20) DEFAULT 'intermediate',
    features TEXT, -- JSON array of implemented features
    tags TEXT, -- JSON array of tags
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    star_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SDK Performance Metrics
CREATE TABLE IF NOT EXISTS sdk_performance_metrics (
    metric_id VARCHAR(50) PRIMARY KEY,
    version_id VARCHAR(50) NOT NULL,
    language VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    total_downloads INTEGER DEFAULT 0,
    active_installations INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    error_rate_percent DECIMAL(5,2),
    crash_rate_percent DECIMAL(5,2),
    user_satisfaction_score DECIMAL(3,2), -- 1.0 to 5.0
    performance_score DECIMAL(3,2), -- 1.0 to 10.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES sdk_versions(version_id) ON DELETE CASCADE,
    UNIQUE(version_id, language, metric_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sdk_downloads_version_timestamp ON sdk_downloads(version_id, download_timestamp);
CREATE INDEX IF NOT EXISTS idx_sdk_usage_analytics_version_timestamp ON sdk_usage_analytics(version_id, request_timestamp);
CREATE INDEX IF NOT EXISTS idx_sdk_code_examples_language_category ON sdk_code_examples(language, category);
CREATE INDEX IF NOT EXISTS idx_sdk_documentation_language_section ON sdk_documentation(language, section);
CREATE INDEX IF NOT EXISTS idx_sdk_feedback_status_created ON sdk_feedback(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sdk_integrations_language_framework ON sdk_integrations(language, framework);
CREATE INDEX IF NOT EXISTS idx_sdk_performance_metrics_date ON sdk_performance_metrics(metric_date);

-- Insert sample SDK versions
INSERT OR IGNORE INTO sdk_versions (version_id, version_number, language, release_type, release_notes, download_url, npm_package, file_size_bytes) VALUES
('js_v1_0_0', '1.0.0', 'javascript', 'stable', 'Initial stable release with full API coverage', 'https://cdn.interviews.tv/sdk/js/interviews-tv-sdk-1.0.0.js', '@interviews-tv/sdk', 45120),
('js_v1_1_0', '1.1.0', 'javascript', 'stable', 'Added WebRTC support and real-time features', 'https://cdn.interviews.tv/sdk/js/interviews-tv-sdk-1.1.0.js', '@interviews-tv/sdk', 52340),
('py_v1_0_0', '1.0.0', 'python', 'stable', 'Python SDK with async/await support', 'https://cdn.interviews.tv/sdk/python/interviews-tv-sdk-1.0.0.tar.gz', 'interviews-tv-sdk', 78900),
('php_v1_0_0', '1.0.0', 'php', 'stable', 'PHP SDK with PSR-4 autoloading', 'https://cdn.interviews.tv/sdk/php/interviews-tv-sdk-1.0.0.zip', 'interviews-tv/sdk', 65430),
('java_v1_0_0', '1.0.0', 'java', 'stable', 'Java SDK with Spring Boot integration', 'https://cdn.interviews.tv/sdk/java/interviews-tv-sdk-1.0.0.jar', 'com.interviews-tv:sdk:1.0.0', 123450),
('csharp_v1_0_0', '1.0.0', 'csharp', 'stable', 'C# SDK with .NET Core support', 'https://cdn.interviews.tv/sdk/csharp/InterviewsTV.SDK.1.0.0.nupkg', 'InterviewsTV.SDK', 89760),
('ruby_v1_0_0', '1.0.0', 'ruby', 'stable', 'Ruby SDK with Rails integration', 'https://cdn.interviews.tv/sdk/ruby/interviews-tv-sdk-1.0.0.gem', 'interviews_tv_sdk', 56780),
('go_v1_0_0', '1.0.0', 'go', 'stable', 'Go SDK with context support', 'https://cdn.interviews.tv/sdk/go/interviews-tv-sdk-v1.0.0.tar.gz', 'github.com/interviews-tv/sdk-go', 43210);

-- Insert sample code examples
INSERT OR IGNORE INTO sdk_code_examples (example_id, language, category, title, description, code_snippet, complexity_level, is_featured) VALUES
('js_auth_basic', 'javascript', 'authentication', 'Basic Authentication', 'Initialize SDK with API key', 'const InterviewsTV = require(''@interviews-tv/sdk'');\n\nconst client = new InterviewsTV({\n  apiKey: ''your-api-key'',\n  environment: ''production''\n});', 'beginner', TRUE),
('py_calendar_sync', 'python', 'calendar', 'Calendar Sync', 'Synchronize interview with calendar', 'import interviews_tv\n\nclient = interviews_tv.Client(api_key="your-api-key")\nresult = await client.calendar.sync_event({\n  "title": "Technical Interview",\n  "start_time": "2024-01-15T10:00:00Z",\n  "duration": 3600\n})', 'intermediate', TRUE),
('php_webhook_setup', 'php', 'webhooks', 'Webhook Setup', 'Configure webhook endpoint', '<?php\nuse InterviewsTV\\SDK\\Client;\n\n$client = new Client([''api_key'' => ''your-api-key'']);\n$webhook = $client->webhooks()->create([\n  ''url'' => ''https://your-app.com/webhooks/interviews'',\n  ''events'' => [''interview.started'', ''interview.ended'']\n]);', 'intermediate', FALSE);

-- Insert sample documentation
INSERT OR IGNORE INTO sdk_documentation (doc_id, language, section, title, slug, content, sort_order, is_published) VALUES
('js_getting_started', 'javascript', 'getting-started', 'Getting Started', 'getting-started', '# Getting Started with JavaScript SDK\n\nInstall the SDK using npm:\n\n```bash\nnpm install @interviews-tv/sdk\n```\n\nInitialize the client:\n\n```javascript\nconst InterviewsTV = require(''@interviews-tv/sdk'');\nconst client = new InterviewsTV({ apiKey: ''your-api-key'' });\n```', 1, TRUE),
('py_installation', 'python', 'getting-started', 'Installation', 'installation', '# Installation\n\nInstall using pip:\n\n```bash\npip install interviews-tv-sdk\n```\n\nOr using poetry:\n\n```bash\npoetry add interviews-tv-sdk\n```', 1, TRUE);
