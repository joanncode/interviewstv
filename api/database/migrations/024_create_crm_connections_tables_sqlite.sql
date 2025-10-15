-- =====================================================
-- CRM CONNECTIONS SYSTEM DATABASE SCHEMA
-- =====================================================
-- Migration: 024_create_crm_connections_tables_sqlite.sql
-- Description: Comprehensive CRM integration system with OAuth flows, contact sync, deal tracking, and analytics
-- Version: 1.0
-- Created: 2024-10-15

-- =====================================================
-- 1. CRM PROVIDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_providers (
    provider_id VARCHAR(50) PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    provider_description TEXT,
    provider_website VARCHAR(255),
    provider_logo_url VARCHAR(255),
    
    -- OAuth Configuration
    oauth_authorization_url VARCHAR(500) NOT NULL,
    oauth_token_url VARCHAR(500) NOT NULL,
    oauth_scope_separator VARCHAR(10) DEFAULT ' ',
    default_scopes TEXT, -- JSON array of default scopes
    
    -- API Configuration
    api_base_url VARCHAR(255) NOT NULL,
    api_version VARCHAR(20),
    rate_limit_requests_per_minute INTEGER DEFAULT 100,
    rate_limit_requests_per_hour INTEGER DEFAULT 1000,
    
    -- Features Support
    supports_contacts BOOLEAN DEFAULT TRUE,
    supports_deals BOOLEAN DEFAULT TRUE,
    supports_companies BOOLEAN DEFAULT TRUE,
    supports_activities BOOLEAN DEFAULT TRUE,
    supports_webhooks BOOLEAN DEFAULT FALSE,
    supports_custom_fields BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_beta BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. USER CRM CONNECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_crm_connections (
    connection_id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    
    -- Connection Details
    connection_name VARCHAR(100),
    external_user_id VARCHAR(100),
    external_user_email VARCHAR(255),
    external_user_name VARCHAR(255),
    
    -- OAuth Tokens (encrypted)
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT,         -- Encrypted
    token_expires_at TIMESTAMP,
    granted_scopes TEXT,        -- JSON array
    
    -- Sync Settings
    sync_contacts BOOLEAN DEFAULT TRUE,
    sync_deals BOOLEAN DEFAULT TRUE,
    sync_companies BOOLEAN DEFAULT TRUE,
    sync_activities BOOLEAN DEFAULT TRUE,
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP,
    
    -- Connection Status
    is_active BOOLEAN DEFAULT TRUE,
    connection_status VARCHAR(20) DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'expired')),
    last_error_message TEXT,
    last_error_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES crm_providers(provider_id) ON DELETE CASCADE
);

-- =====================================================
-- 3. CRM CONTACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contacts (
    contact_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    external_contact_id VARCHAR(100) NOT NULL,
    
    -- Contact Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    
    -- Company Information
    company_name VARCHAR(200),
    job_title VARCHAR(150),
    department VARCHAR(100),
    
    -- Address Information
    street_address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Social & Web
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    twitter_handle VARCHAR(100),
    
    -- CRM Specific
    lead_status VARCHAR(50),
    contact_owner VARCHAR(100),
    contact_source VARCHAR(100),
    
    -- Custom Fields (JSON)
    custom_fields TEXT, -- JSON object
    
    -- Sync Information
    last_modified_in_crm TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    sync_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, external_contact_id)
);

-- =====================================================
-- 4. CRM DEALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_deals (
    deal_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    external_deal_id VARCHAR(100) NOT NULL,
    
    -- Deal Information
    deal_name VARCHAR(200) NOT NULL,
    deal_description TEXT,
    deal_amount DECIMAL(15,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    
    -- Deal Status
    deal_stage VARCHAR(100),
    deal_status VARCHAR(50),
    probability_percentage INTEGER,
    
    -- Dates
    expected_close_date DATE,
    actual_close_date DATE,
    created_date DATE,
    
    -- Ownership
    deal_owner VARCHAR(100),
    deal_source VARCHAR(100),
    
    -- Associated Records
    primary_contact_id VARCHAR(100),
    company_name VARCHAR(200),
    
    -- Custom Fields (JSON)
    custom_fields TEXT, -- JSON object
    
    -- Sync Information
    last_modified_in_crm TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    sync_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, external_deal_id)
);

-- =====================================================
-- 5. CRM COMPANIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_companies (
    company_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    external_company_id VARCHAR(100) NOT NULL,
    
    -- Company Information
    company_name VARCHAR(200) NOT NULL,
    company_description TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    annual_revenue DECIMAL(15,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    
    -- Contact Information
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Address Information
    street_address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Social & Web
    linkedin_url VARCHAR(255),
    twitter_handle VARCHAR(100),
    
    -- CRM Specific
    company_owner VARCHAR(100),
    company_source VARCHAR(100),
    company_type VARCHAR(50),
    
    -- Custom Fields (JSON)
    custom_fields TEXT, -- JSON object
    
    -- Sync Information
    last_modified_in_crm TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    sync_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, external_company_id)
);

-- =====================================================
-- 6. CRM ACTIVITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_activities (
    activity_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    external_activity_id VARCHAR(100) NOT NULL,
    
    -- Activity Information
    activity_type VARCHAR(50) NOT NULL, -- call, email, meeting, task, note
    activity_subject VARCHAR(200),
    activity_description TEXT,
    activity_status VARCHAR(50),
    
    -- Dates and Duration
    activity_date TIMESTAMP,
    due_date TIMESTAMP,
    completed_date TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Associations
    associated_contact_id VARCHAR(100),
    associated_deal_id VARCHAR(100),
    associated_company_id VARCHAR(100),
    activity_owner VARCHAR(100),
    
    -- Interview Integration
    interview_id VARCHAR(36), -- Link to interviews table
    is_interview_related BOOLEAN DEFAULT FALSE,
    
    -- Custom Fields (JSON)
    custom_fields TEXT, -- JSON object
    
    -- Sync Information
    last_modified_in_crm TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    sync_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, external_activity_id)
);

-- =====================================================
-- 7. CRM SYNC OPERATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_sync_operations (
    sync_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    
    -- Sync Details
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
    sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
    data_types TEXT, -- JSON array: ['contacts', 'deals', 'companies', 'activities']
    
    -- Status and Progress
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Error Handling
    error_message TEXT,
    error_details TEXT, -- JSON object with detailed error info
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE
);

-- =====================================================
-- 8. CRM FIELD MAPPINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_field_mappings (
    mapping_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,

    -- Mapping Configuration
    object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('contact', 'deal', 'company', 'activity')),
    crm_field_name VARCHAR(100) NOT NULL,
    crm_field_type VARCHAR(50), -- text, number, date, boolean, picklist
    local_field_name VARCHAR(100) NOT NULL,

    -- Mapping Rules
    is_required BOOLEAN DEFAULT FALSE,
    is_custom_field BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    transformation_rule TEXT, -- JSON object for data transformation

    -- Sync Settings
    sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, object_type, crm_field_name)
);

-- =====================================================
-- 9. CRM WEBHOOKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_webhooks (
    webhook_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,

    -- Webhook Configuration
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(100), -- For signature verification
    event_types TEXT, -- JSON array of subscribed events

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    webhook_status VARCHAR(20) DEFAULT 'active' CHECK (webhook_status IN ('active', 'inactive', 'failed')),

    -- Statistics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_delivery_at TIMESTAMP,
    last_failure_at TIMESTAMP,

    -- Error Handling
    failure_count INTEGER DEFAULT 0,
    last_error_message TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE
);

-- =====================================================
-- 10. CRM ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_analytics (
    analytics_id VARCHAR(36) PRIMARY KEY,
    connection_id VARCHAR(36) NOT NULL,
    analytics_date DATE NOT NULL,

    -- Sync Statistics
    sync_operations_count INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,

    -- Data Statistics
    contacts_synced INTEGER DEFAULT 0,
    deals_synced INTEGER DEFAULT 0,
    companies_synced INTEGER DEFAULT 0,
    activities_synced INTEGER DEFAULT 0,

    -- Performance Metrics
    average_sync_duration_seconds INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    api_rate_limit_hits INTEGER DEFAULT 0,

    -- Error Statistics
    total_errors INTEGER DEFAULT 0,
    authentication_errors INTEGER DEFAULT 0,
    rate_limit_errors INTEGER DEFAULT 0,
    data_validation_errors INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (connection_id) REFERENCES user_crm_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, analytics_date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User CRM Connections indexes
CREATE INDEX IF NOT EXISTS idx_user_crm_connections_user_id ON user_crm_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crm_connections_provider_id ON user_crm_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_crm_connections_status ON user_crm_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_user_crm_connections_active ON user_crm_connections(is_active);

-- CRM Contacts indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_connection_id ON crm_contacts(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_sync_status ON crm_contacts(sync_status);

-- CRM Deals indexes (using existing column names)
CREATE INDEX IF NOT EXISTS idx_crm_deals_connection_id ON crm_deals(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(deal_stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_value ON crm_deals(deal_value);

-- CRM Companies indexes
CREATE INDEX IF NOT EXISTS idx_crm_companies_connection_id ON crm_companies(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON crm_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_crm_companies_industry ON crm_companies(industry);

-- CRM Activities indexes
CREATE INDEX IF NOT EXISTS idx_crm_activities_connection_id ON crm_activities(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_date ON crm_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_crm_activities_interview ON crm_activities(interview_id);

-- CRM Sync Operations indexes
CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_connection_id ON crm_sync_operations(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_status ON crm_sync_operations(sync_status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_created_at ON crm_sync_operations(created_at);

-- CRM Analytics indexes
CREATE INDEX IF NOT EXISTS idx_crm_analytics_connection_id ON crm_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_analytics_date ON crm_analytics(analytics_date);

-- =====================================================
-- DEFAULT CRM PROVIDERS DATA
-- =====================================================

-- Insert default CRM providers
INSERT OR IGNORE INTO crm_providers (
    provider_id, provider_name, provider_description, provider_website,
    oauth_authorization_url, oauth_token_url, api_base_url, api_version,
    default_scopes, rate_limit_requests_per_minute, rate_limit_requests_per_hour,
    supports_contacts, supports_deals, supports_companies, supports_activities, supports_webhooks
) VALUES
-- Salesforce
('salesforce', 'Salesforce', 'World''s #1 CRM platform for sales, service, and marketing', 'https://salesforce.com',
 'https://login.salesforce.com/services/oauth2/authorize', 'https://login.salesforce.com/services/oauth2/token',
 'https://[instance].salesforce.com/services/data', 'v58.0',
 '["api", "refresh_token", "offline_access"]', 100, 1000,
 TRUE, TRUE, TRUE, TRUE, TRUE),

-- HubSpot
('hubspot', 'HubSpot', 'Inbound marketing, sales, and service software', 'https://hubspot.com',
 'https://app.hubspot.com/oauth/authorize', 'https://api.hubapi.com/oauth/v1/token',
 'https://api.hubapi.com', 'v3',
 '["contacts", "deals", "companies", "timeline"]', 100, 1000,
 TRUE, TRUE, TRUE, TRUE, TRUE),

-- Pipedrive
('pipedrive', 'Pipedrive', 'Sales CRM and pipeline management tool', 'https://pipedrive.com',
 'https://oauth.pipedrive.com/oauth/authorize', 'https://oauth.pipedrive.com/oauth/token',
 'https://api.pipedrive.com', 'v1',
 '["deals:read", "deals:write", "persons:read", "persons:write", "organizations:read", "organizations:write"]', 100, 1000,
 TRUE, TRUE, TRUE, TRUE, TRUE),

-- Zoho CRM
('zoho_crm', 'Zoho CRM', 'Cloud-based customer relationship management software', 'https://zoho.com/crm',
 'https://accounts.zoho.com/oauth/v2/auth', 'https://accounts.zoho.com/oauth/v2/token',
 'https://www.zohoapis.com/crm', 'v2',
 '["ZohoCRM.modules.ALL", "ZohoCRM.settings.ALL"]', 100, 1000,
 TRUE, TRUE, TRUE, TRUE, TRUE),

-- Microsoft Dynamics 365
('dynamics365', 'Microsoft Dynamics 365', 'Microsoft''s cloud-based CRM and ERP solution', 'https://dynamics.microsoft.com',
 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
 'https://[org].api.crm.dynamics.com/api/data', 'v9.2',
 '["https://[org].crm.dynamics.com/user_impersonation"]', 60, 600,
 TRUE, TRUE, TRUE, TRUE, TRUE),

-- Freshworks CRM (Freshsales)
('freshworks_crm', 'Freshworks CRM', 'Customer experience software suite', 'https://freshworks.com/crm',
 'https://[domain].freshsales.io/oauth/authorize', 'https://[domain].freshsales.io/oauth/token',
 'https://[domain].freshsales.io/api', 'v2',
 '["contacts:read", "contacts:write", "deals:read", "deals:write", "accounts:read", "accounts:write"]', 100, 1000,
 TRUE, TRUE, TRUE, TRUE, FALSE);
