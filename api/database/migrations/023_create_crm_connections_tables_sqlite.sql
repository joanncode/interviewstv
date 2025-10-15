-- CRM System Connections Tables
-- Migration: 023_create_crm_connections_tables_sqlite.sql

-- CRM contact mappings and synchronization
CREATE TABLE IF NOT EXISTS crm_contact_mappings (
    mapping_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    local_contact_id TEXT, -- Internal contact ID
    crm_contact_id TEXT NOT NULL, -- External CRM contact ID
    crm_contact_type TEXT DEFAULT 'contact', -- contact, lead, account, opportunity
    contact_data TEXT, -- JSON contact information
    sync_status TEXT DEFAULT 'pending', -- pending, synced, failed, conflict
    last_sync_at DATETIME,
    sync_direction TEXT DEFAULT 'bidirectional', -- import, export, bidirectional
    conflict_resolution TEXT DEFAULT 'manual', -- manual, local_wins, crm_wins, merge
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, crm_contact_id)
);

-- CRM interview lead tracking
CREATE TABLE IF NOT EXISTS crm_interview_leads (
    lead_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    interview_id TEXT,
    crm_lead_id TEXT, -- External CRM lead/opportunity ID
    lead_source TEXT DEFAULT 'interview', -- interview, referral, website, campaign
    lead_status TEXT DEFAULT 'new', -- new, contacted, qualified, proposal, negotiation, closed_won, closed_lost
    lead_score INTEGER DEFAULT 0,
    estimated_value DECIMAL(10,2),
    currency_code TEXT DEFAULT 'USD',
    probability_percentage INTEGER DEFAULT 0,
    expected_close_date DATE,
    lead_data TEXT, -- JSON lead information
    notes TEXT,
    tags TEXT, -- JSON array of tags
    assigned_to TEXT, -- CRM user/team assignment
    pipeline_stage TEXT,
    last_activity_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (interview_id) REFERENCES interview_rooms(id) ON DELETE SET NULL
);

-- CRM activity tracking and logging
CREATE TABLE IF NOT EXISTS crm_activity_logs (
    activity_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    crm_contact_id TEXT,
    crm_lead_id TEXT,
    activity_type TEXT NOT NULL, -- call, email, meeting, note, task, interview
    activity_subject TEXT,
    activity_description TEXT,
    activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    activity_duration_minutes INTEGER,
    activity_outcome TEXT, -- completed, scheduled, cancelled, no_show
    activity_data TEXT, -- JSON activity details
    interview_id TEXT, -- Link to interview if applicable
    crm_activity_id TEXT, -- External CRM activity ID
    sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (interview_id) REFERENCES interview_rooms(id) ON DELETE SET NULL
);

-- CRM pipeline and deal tracking
CREATE TABLE IF NOT EXISTS crm_deals (
    deal_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    crm_deal_id TEXT, -- External CRM deal/opportunity ID
    deal_name TEXT NOT NULL,
    deal_stage TEXT,
    deal_value DECIMAL(10,2),
    currency_code TEXT DEFAULT 'USD',
    probability_percentage INTEGER DEFAULT 0,
    expected_close_date DATE,
    actual_close_date DATE,
    deal_source TEXT DEFAULT 'interview', -- interview, referral, website, campaign
    contact_id TEXT, -- Associated contact
    company_name TEXT,
    deal_owner TEXT, -- CRM user assignment
    deal_data TEXT, -- JSON deal information
    notes TEXT,
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE
);

-- CRM synchronization settings and preferences
CREATE TABLE IF NOT EXISTS crm_sync_settings (
    setting_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    setting_category TEXT NOT NULL, -- contacts, leads, deals, activities, general
    setting_key TEXT NOT NULL,
    setting_value TEXT, -- JSON setting value
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, setting_category, setting_key)
);

-- CRM field mappings for data transformation
CREATE TABLE IF NOT EXISTS crm_field_mappings (
    mapping_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    object_type TEXT NOT NULL, -- contact, lead, deal, activity
    local_field_name TEXT NOT NULL,
    crm_field_name TEXT NOT NULL,
    field_type TEXT DEFAULT 'text', -- text, number, date, boolean, picklist, lookup
    transformation_rule TEXT, -- JSON transformation rules
    is_required BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(connection_id, object_type, local_field_name)
);

-- CRM automation rules and triggers
CREATE TABLE IF NOT EXISTS crm_automation_rules (
    rule_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    trigger_event TEXT NOT NULL, -- interview_created, interview_completed, contact_updated, lead_qualified
    trigger_conditions TEXT, -- JSON conditions
    action_type TEXT NOT NULL, -- create_contact, update_lead, create_activity, send_email, assign_owner
    action_config TEXT, -- JSON action configuration
    is_active BOOLEAN DEFAULT 1,
    execution_count INTEGER DEFAULT 0,
    last_execution_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE
);

-- CRM sync conflicts and resolution
CREATE TABLE IF NOT EXISTS crm_sync_conflicts (
    conflict_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    object_type TEXT NOT NULL, -- contact, lead, deal, activity
    local_object_id TEXT,
    crm_object_id TEXT,
    conflict_type TEXT NOT NULL, -- field_mismatch, duplicate_record, missing_required_field
    conflict_data TEXT, -- JSON conflict details
    resolution_status TEXT DEFAULT 'pending', -- pending, resolved, ignored
    resolution_action TEXT, -- manual_merge, local_wins, crm_wins, create_new
    resolved_by INTEGER,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- CRM analytics and reporting
CREATE TABLE IF NOT EXISTS crm_analytics (
    analytics_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    connection_id TEXT NOT NULL,
    date_period DATE NOT NULL,
    contacts_synced INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    deals_created INTEGER DEFAULT 0,
    activities_logged INTEGER DEFAULT 0,
    sync_errors INTEGER DEFAULT 0,
    conversion_rate REAL DEFAULT 0, -- Interview to lead conversion
    deal_conversion_rate REAL DEFAULT 0, -- Lead to deal conversion
    total_deal_value DECIMAL(10,2) DEFAULT 0,
    average_deal_size DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES user_app_connections(connection_id) ON DELETE CASCADE,
    UNIQUE(user_id, connection_id, date_period)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_crm_contact_mappings_user ON crm_contact_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_mappings_connection ON crm_contact_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_mappings_crm_id ON crm_contact_mappings(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_mappings_sync_status ON crm_contact_mappings(sync_status);

CREATE INDEX IF NOT EXISTS idx_crm_interview_leads_user ON crm_interview_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_interview_leads_connection ON crm_interview_leads(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_interview_leads_interview ON crm_interview_leads(interview_id);
CREATE INDEX IF NOT EXISTS idx_crm_interview_leads_status ON crm_interview_leads(lead_status);

CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_user ON crm_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_connection ON crm_activity_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_type ON crm_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_date ON crm_activity_logs(activity_date);

CREATE INDEX IF NOT EXISTS idx_crm_deals_user ON crm_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_connection ON crm_deals(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(deal_stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_crm_sync_settings_connection ON crm_sync_settings(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_settings_category ON crm_sync_settings(setting_category);

CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_connection ON crm_field_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_object_type ON crm_field_mappings(object_type);

CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_connection ON crm_automation_rules(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_trigger ON crm_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_active ON crm_automation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_connection ON crm_sync_conflicts(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_status ON crm_sync_conflicts(resolution_status);

CREATE INDEX IF NOT EXISTS idx_crm_analytics_user ON crm_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_analytics_connection ON crm_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_crm_analytics_date ON crm_analytics(date_period);

-- Insert default CRM sync settings
INSERT OR IGNORE INTO crm_sync_settings (setting_id, user_id, connection_id, setting_category, setting_key, setting_value) VALUES
-- Default contact sync settings
('default_contact_sync_direction', 1, 'default', 'contacts', 'sync_direction', '"bidirectional"'),
('default_contact_auto_sync', 1, 'default', 'contacts', 'auto_sync_enabled', 'true'),
('default_contact_sync_frequency', 1, 'default', 'contacts', 'sync_frequency_hours', '24'),
('default_contact_conflict_resolution', 1, 'default', 'contacts', 'conflict_resolution', '"manual"'),

-- Default lead sync settings
('default_lead_auto_create', 1, 'default', 'leads', 'auto_create_from_interviews', 'true'),
('default_lead_qualification_score', 1, 'default', 'leads', 'auto_qualification_threshold', '70'),
('default_lead_assignment', 1, 'default', 'leads', 'default_owner_assignment', '"round_robin"'),

-- Default deal sync settings
('default_deal_auto_create', 1, 'default', 'deals', 'auto_create_from_qualified_leads', 'false'),
('default_deal_pipeline', 1, 'default', 'deals', 'default_pipeline_stage', '"prospecting"'),
('default_deal_probability', 1, 'default', 'deals', 'initial_probability_percentage', '10'),

-- Default activity sync settings
('default_activity_auto_log', 1, 'default', 'activities', 'auto_log_interviews', 'true'),
('default_activity_sync_recordings', 1, 'default', 'activities', 'sync_recording_links', 'true'),
('default_activity_sync_notes', 1, 'default', 'activities', 'sync_interview_notes', 'true');

-- Insert default field mappings for common CRM systems
INSERT OR IGNORE INTO crm_field_mappings (mapping_id, user_id, connection_id, object_type, local_field_name, crm_field_name, field_type, is_required) VALUES
-- Contact field mappings
('default_contact_email', 1, 'default', 'contact', 'email', 'email', 'text', 1),
('default_contact_first_name', 1, 'default', 'contact', 'first_name', 'firstname', 'text', 1),
('default_contact_last_name', 1, 'default', 'contact', 'last_name', 'lastname', 'text', 1),
('default_contact_phone', 1, 'default', 'contact', 'phone', 'phone', 'text', 0),
('default_contact_company', 1, 'default', 'contact', 'company', 'company', 'text', 0),
('default_contact_title', 1, 'default', 'contact', 'job_title', 'jobtitle', 'text', 0),

-- Lead field mappings
('default_lead_email', 1, 'default', 'lead', 'email', 'email', 'text', 1),
('default_lead_first_name', 1, 'default', 'lead', 'first_name', 'firstname', 'text', 1),
('default_lead_last_name', 1, 'default', 'lead', 'last_name', 'lastname', 'text', 1),
('default_lead_company', 1, 'default', 'lead', 'company', 'company', 'text', 0),
('default_lead_source', 1, 'default', 'lead', 'lead_source', 'leadsource', 'picklist', 0),
('default_lead_status', 1, 'default', 'lead', 'lead_status', 'leadstatus', 'picklist', 1),

-- Deal field mappings
('default_deal_name', 1, 'default', 'deal', 'deal_name', 'dealname', 'text', 1),
('default_deal_amount', 1, 'default', 'deal', 'deal_value', 'amount', 'number', 0),
('default_deal_stage', 1, 'default', 'deal', 'deal_stage', 'dealstage', 'picklist', 1),
('default_deal_close_date', 1, 'default', 'deal', 'expected_close_date', 'closedate', 'date', 0),
('default_deal_probability', 1, 'default', 'deal', 'probability_percentage', 'probability', 'number', 0);

-- Insert default automation rules
INSERT OR IGNORE INTO crm_automation_rules (rule_id, user_id, connection_id, rule_name, rule_description, trigger_event, trigger_conditions, action_type, action_config) VALUES
('auto_create_contact_from_interview', 1, 'default', 'Auto Create Contact from Interview', 'Automatically create a contact in CRM when a new interview is scheduled', 'interview_created', '{"guest_email_exists": true}', 'create_contact', '{"source": "interview", "lifecycle_stage": "lead"}'),
('auto_log_interview_activity', 1, 'default', 'Auto Log Interview Activity', 'Automatically log interview as an activity in CRM', 'interview_completed', '{}', 'create_activity', '{"activity_type": "meeting", "subject": "Interview: {{interview_title}}", "include_recording": true}'),
('auto_qualify_lead_from_interview', 1, 'default', 'Auto Qualify Lead from Interview', 'Automatically qualify leads based on interview completion', 'interview_completed', '{"interview_duration_minutes": {">=": 30}}', 'update_lead', '{"lead_status": "qualified", "lead_score": {"+=": 25}}'),
('auto_create_deal_from_qualified_lead', 1, 'default', 'Auto Create Deal from Qualified Lead', 'Automatically create a deal when a lead is qualified', 'lead_qualified', '{"lead_score": {">=": 70}}', 'create_deal', '{"deal_stage": "prospecting", "probability": 20, "amount": 10000}');
