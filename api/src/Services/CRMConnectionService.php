<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * CRM Connection Service
 * Manages comprehensive CRM system integrations, contact synchronization, and lead tracking
 */
class CRMConnectionService
{
    private $db;
    private $encryptionKey;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->encryptionKey = $_ENV['ENCRYPTION_KEY'] ?? 'default-key-change-in-production';
    }

    // ==================== CONTACT MANAGEMENT ====================

    /**
     * Sync contacts from CRM
     */
    public function syncContactsFromCRM(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'CRM connection not found'
                ];
            }

            $syncDirection = $options['sync_direction'] ?? 'import';
            $limit = $options['limit'] ?? 100;
            $offset = $options['offset'] ?? 0;

            // Get contacts from CRM
            $crmContacts = $this->fetchContactsFromCRM($connection, $limit, $offset);
            
            $syncedCount = 0;
            $errorCount = 0;
            $conflicts = [];

            foreach ($crmContacts as $crmContact) {
                try {
                    $result = $this->syncSingleContact($userId, $connectionId, $crmContact, $syncDirection);
                    
                    if ($result['success']) {
                        $syncedCount++;
                    } else {
                        $errorCount++;
                        if ($result['conflict']) {
                            $conflicts[] = $result['conflict'];
                        }
                    }
                } catch (Exception $e) {
                    $errorCount++;
                    error_log("Contact sync error: " . $e->getMessage());
                }
            }

            // Update sync analytics
            $this->updateSyncAnalytics($userId, $connectionId, 'contacts', $syncedCount, $errorCount);

            return [
                'success' => true,
                'data' => [
                    'synced_count' => $syncedCount,
                    'error_count' => $errorCount,
                    'conflicts_count' => count($conflicts),
                    'conflicts' => $conflicts,
                    'total_processed' => count($crmContacts)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to sync contacts: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create contact in CRM
     */
    public function createContactInCRM(int $userId, string $connectionId, array $contactData): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'CRM connection not found'
                ];
            }

            // Transform contact data using field mappings
            $transformedData = $this->transformContactData($connectionId, $contactData, 'export');

            // Create contact in CRM
            $crmContact = $this->createCRMContact($connection, $transformedData);

            if ($crmContact['success']) {
                // Create local mapping
                $mappingId = 'mapping_' . uniqid();
                $stmt = $this->db->prepare("
                    INSERT INTO crm_contact_mappings (
                        mapping_id, user_id, connection_id, local_contact_id,
                        crm_contact_id, contact_data, sync_status, last_sync_at
                    ) VALUES (
                        :mapping_id, :user_id, :connection_id, :local_contact_id,
                        :crm_contact_id, :contact_data, 'synced', CURRENT_TIMESTAMP
                    )
                ");

                $stmt->execute([
                    'mapping_id' => $mappingId,
                    'user_id' => $userId,
                    'connection_id' => $connectionId,
                    'local_contact_id' => $contactData['local_id'] ?? null,
                    'crm_contact_id' => $crmContact['data']['id'],
                    'contact_data' => json_encode($crmContact['data'])
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'crm_contact_id' => $crmContact['data']['id'],
                        'mapping_id' => $mappingId,
                        'contact_data' => $crmContact['data']
                    ]
                ];
            }

            return $crmContact;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create contact in CRM: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get contact mappings
     */
    public function getContactMappings(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $syncStatus = $options['sync_status'] ?? null;
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;

            $sql = "SELECT * FROM crm_contact_mappings WHERE user_id = :user_id AND connection_id = :connection_id";
            $params = ['user_id' => $userId, 'connection_id' => $connectionId];

            if ($syncStatus) {
                $sql .= " AND sync_status = :sync_status";
                $params['sync_status'] = $syncStatus;
            }

            $sql .= " ORDER BY last_sync_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            
            $stmt->execute();
            $mappings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($mappings as &$mapping) {
                $mapping['contact_data'] = json_decode($mapping['contact_data'] ?? '{}', true);
            }

            return [
                'success' => true,
                'data' => $mappings,
                'total' => count($mappings)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get contact mappings: ' . $e->getMessage()
            ];
        }
    }

    // ==================== LEAD MANAGEMENT ====================

    /**
     * Create lead from interview
     */
    public function createLeadFromInterview(int $userId, string $connectionId, string $interviewId, array $leadData = []): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'CRM connection not found'
                ];
            }

            // Get interview details
            $interview = $this->getInterviewDetails($interviewId);
            if (!$interview) {
                return [
                    'success' => false,
                    'message' => 'Interview not found'
                ];
            }

            // Prepare lead data
            $leadInfo = array_merge([
                'lead_source' => 'interview',
                'lead_status' => 'new',
                'lead_score' => $this->calculateLeadScore($interview),
                'estimated_value' => $leadData['estimated_value'] ?? 10000,
                'probability_percentage' => 10,
                'notes' => "Lead generated from interview: " . $interview['title']
            ], $leadData);

            // Create lead in CRM
            $crmLead = $this->createCRMLead($connection, $leadInfo, $interview);

            if ($crmLead['success']) {
                // Create local lead record
                $leadId = 'lead_' . uniqid();
                $stmt = $this->db->prepare("
                    INSERT INTO crm_interview_leads (
                        lead_id, user_id, connection_id, interview_id, crm_lead_id,
                        lead_source, lead_status, lead_score, estimated_value,
                        probability_percentage, lead_data, notes
                    ) VALUES (
                        :lead_id, :user_id, :connection_id, :interview_id, :crm_lead_id,
                        :lead_source, :lead_status, :lead_score, :estimated_value,
                        :probability_percentage, :lead_data, :notes
                    )
                ");

                $stmt->execute([
                    'lead_id' => $leadId,
                    'user_id' => $userId,
                    'connection_id' => $connectionId,
                    'interview_id' => $interviewId,
                    'crm_lead_id' => $crmLead['data']['id'],
                    'lead_source' => $leadInfo['lead_source'],
                    'lead_status' => $leadInfo['lead_status'],
                    'lead_score' => $leadInfo['lead_score'],
                    'estimated_value' => $leadInfo['estimated_value'],
                    'probability_percentage' => $leadInfo['probability_percentage'],
                    'lead_data' => json_encode($crmLead['data']),
                    'notes' => $leadInfo['notes']
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'lead_id' => $leadId,
                        'crm_lead_id' => $crmLead['data']['id'],
                        'lead_score' => $leadInfo['lead_score'],
                        'lead_data' => $crmLead['data']
                    ]
                ];
            }

            return $crmLead;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create lead from interview: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get interview leads
     */
    public function getInterviewLeads(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $leadStatus = $options['lead_status'] ?? null;
            $interviewId = $options['interview_id'] ?? null;
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;

            $sql = "SELECT l.*, i.title as interview_title, i.scheduled_start 
                    FROM crm_interview_leads l 
                    LEFT JOIN interview_rooms i ON l.interview_id = i.id 
                    WHERE l.user_id = :user_id AND l.connection_id = :connection_id";
            $params = ['user_id' => $userId, 'connection_id' => $connectionId];

            if ($leadStatus) {
                $sql .= " AND l.lead_status = :lead_status";
                $params['lead_status'] = $leadStatus;
            }

            if ($interviewId) {
                $sql .= " AND l.interview_id = :interview_id";
                $params['interview_id'] = $interviewId;
            }

            $sql .= " ORDER BY l.created_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            
            $stmt->execute();
            $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($leads as &$lead) {
                $lead['lead_data'] = json_decode($lead['lead_data'] ?? '{}', true);
                $lead['tags'] = json_decode($lead['tags'] ?? '[]', true);
            }

            return [
                'success' => true,
                'data' => $leads,
                'total' => count($leads)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get interview leads: ' . $e->getMessage()
            ];
        }
    }

    // ==================== DEAL MANAGEMENT ====================

    /**
     * Create deal from qualified lead
     */
    public function createDealFromLead(int $userId, string $connectionId, string $leadId, array $dealData = []): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'CRM connection not found'
                ];
            }

            // Get lead details
            $lead = $this->getLeadDetails($leadId, $userId);
            if (!$lead) {
                return [
                    'success' => false,
                    'message' => 'Lead not found'
                ];
            }

            // Prepare deal data
            $dealInfo = array_merge([
                'deal_name' => $dealData['deal_name'] ?? "Deal from Interview Lead",
                'deal_stage' => 'prospecting',
                'deal_value' => $lead['estimated_value'] ?? 10000,
                'probability_percentage' => $lead['probability_percentage'] ?? 20,
                'deal_source' => 'interview',
                'notes' => "Deal created from qualified interview lead"
            ], $dealData);

            // Create deal in CRM
            $crmDeal = $this->createCRMDeal($connection, $dealInfo, $lead);

            if ($crmDeal['success']) {
                // Create local deal record
                $dealId = 'deal_' . uniqid();
                $stmt = $this->db->prepare("
                    INSERT INTO crm_deals (
                        deal_id, user_id, connection_id, crm_deal_id, deal_name,
                        deal_stage, deal_value, probability_percentage, deal_source,
                        contact_id, deal_data, notes
                    ) VALUES (
                        :deal_id, :user_id, :connection_id, :crm_deal_id, :deal_name,
                        :deal_stage, :deal_value, :probability_percentage, :deal_source,
                        :contact_id, :deal_data, :notes
                    )
                ");

                $stmt->execute([
                    'deal_id' => $dealId,
                    'user_id' => $userId,
                    'connection_id' => $connectionId,
                    'crm_deal_id' => $crmDeal['data']['id'],
                    'deal_name' => $dealInfo['deal_name'],
                    'deal_stage' => $dealInfo['deal_stage'],
                    'deal_value' => $dealInfo['deal_value'],
                    'probability_percentage' => $dealInfo['probability_percentage'],
                    'deal_source' => $dealInfo['deal_source'],
                    'contact_id' => $lead['crm_contact_id'] ?? null,
                    'deal_data' => json_encode($crmDeal['data']),
                    'notes' => $dealInfo['notes']
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'deal_id' => $dealId,
                        'crm_deal_id' => $crmDeal['data']['id'],
                        'deal_value' => $dealInfo['deal_value'],
                        'deal_data' => $crmDeal['data']
                    ]
                ];
            }

            return $crmDeal;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create deal from lead: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get CRM deals
     */
    public function getCRMDeals(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $dealStage = $options['deal_stage'] ?? null;
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;

            $sql = "SELECT * FROM crm_deals WHERE user_id = :user_id AND connection_id = :connection_id";
            $params = ['user_id' => $userId, 'connection_id' => $connectionId];

            if ($dealStage) {
                $sql .= " AND deal_stage = :deal_stage";
                $params['deal_stage'] = $dealStage;
            }

            $sql .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

            $stmt->execute();
            $deals = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($deals as &$deal) {
                $deal['deal_data'] = json_decode($deal['deal_data'] ?? '{}', true);
                $deal['tags'] = json_decode($deal['tags'] ?? '[]', true);
            }

            return [
                'success' => true,
                'data' => $deals,
                'total' => count($deals)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get CRM deals: ' . $e->getMessage()
            ];
        }
    }

    // ==================== ACTIVITY LOGGING ====================

    /**
     * Log interview activity to CRM
     */
    public function logInterviewActivity(int $userId, string $connectionId, string $interviewId, array $activityData = []): array
    {
        try {
            $connection = $this->getConnectionDetails($connectionId, $userId);
            if (!$connection) {
                return [
                    'success' => false,
                    'message' => 'CRM connection not found'
                ];
            }

            // Get interview details
            $interview = $this->getInterviewDetails($interviewId);
            if (!$interview) {
                return [
                    'success' => false,
                    'message' => 'Interview not found'
                ];
            }

            // Prepare activity data
            $activityInfo = array_merge([
                'activity_type' => 'meeting',
                'activity_subject' => "Interview: " . $interview['title'],
                'activity_description' => "Interview conducted with " . ($interview['guest_name'] ?? 'guest'),
                'activity_date' => $interview['actual_start'] ?? $interview['scheduled_start'],
                'activity_duration_minutes' => $this->calculateInterviewDuration($interview),
                'activity_outcome' => $interview['status'] === 'ended' ? 'completed' : 'scheduled'
            ], $activityData);

            // Create activity in CRM
            $crmActivity = $this->createCRMActivity($connection, $activityInfo, $interview);

            if ($crmActivity['success']) {
                // Create local activity log
                $activityId = 'activity_' . uniqid();
                $stmt = $this->db->prepare("
                    INSERT INTO crm_activity_logs (
                        activity_id, user_id, connection_id, activity_type,
                        activity_subject, activity_description, activity_date,
                        activity_duration_minutes, activity_outcome, interview_id,
                        crm_activity_id, activity_data, sync_status
                    ) VALUES (
                        :activity_id, :user_id, :connection_id, :activity_type,
                        :activity_subject, :activity_description, :activity_date,
                        :activity_duration_minutes, :activity_outcome, :interview_id,
                        :crm_activity_id, :activity_data, 'synced'
                    )
                ");

                $stmt->execute([
                    'activity_id' => $activityId,
                    'user_id' => $userId,
                    'connection_id' => $connectionId,
                    'activity_type' => $activityInfo['activity_type'],
                    'activity_subject' => $activityInfo['activity_subject'],
                    'activity_description' => $activityInfo['activity_description'],
                    'activity_date' => $activityInfo['activity_date'],
                    'activity_duration_minutes' => $activityInfo['activity_duration_minutes'],
                    'activity_outcome' => $activityInfo['activity_outcome'],
                    'interview_id' => $interviewId,
                    'crm_activity_id' => $crmActivity['data']['id'],
                    'activity_data' => json_encode($crmActivity['data'])
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'activity_id' => $activityId,
                        'crm_activity_id' => $crmActivity['data']['id'],
                        'activity_data' => $crmActivity['data']
                    ]
                ];
            }

            return $crmActivity;

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to log interview activity: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get activity logs
     */
    public function getActivityLogs(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $activityType = $options['activity_type'] ?? null;
            $interviewId = $options['interview_id'] ?? null;
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;

            $sql = "SELECT a.*, i.title as interview_title
                    FROM crm_activity_logs a
                    LEFT JOIN interview_rooms i ON a.interview_id = i.id
                    WHERE a.user_id = :user_id AND a.connection_id = :connection_id";
            $params = ['user_id' => $userId, 'connection_id' => $connectionId];

            if ($activityType) {
                $sql .= " AND a.activity_type = :activity_type";
                $params['activity_type'] = $activityType;
            }

            if ($interviewId) {
                $sql .= " AND a.interview_id = :interview_id";
                $params['interview_id'] = $interviewId;
            }

            $sql .= " ORDER BY a.activity_date DESC LIMIT :limit OFFSET :offset";

            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

            $stmt->execute();
            $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($activities as &$activity) {
                $activity['activity_data'] = json_decode($activity['activity_data'] ?? '{}', true);
            }

            return [
                'success' => true,
                'data' => $activities,
                'total' => count($activities)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get activity logs: ' . $e->getMessage()
            ];
        }
    }

    // ==================== AUTOMATION & SYNC ====================

    /**
     * Execute automation rules
     */
    public function executeAutomationRules(int $userId, string $connectionId, string $triggerEvent, array $triggerData): array
    {
        try {
            // Get active automation rules for this trigger
            $stmt = $this->db->prepare("
                SELECT * FROM crm_automation_rules
                WHERE user_id = :user_id AND connection_id = :connection_id
                AND trigger_event = :trigger_event AND is_active = 1
            ");
            $stmt->execute([
                'user_id' => $userId,
                'connection_id' => $connectionId,
                'trigger_event' => $triggerEvent
            ]);
            $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $executedRules = [];
            $errors = [];

            foreach ($rules as $rule) {
                try {
                    // Check trigger conditions
                    $conditions = json_decode($rule['trigger_conditions'], true);
                    if (!$this->evaluateConditions($conditions, $triggerData)) {
                        continue;
                    }

                    // Execute action
                    $actionConfig = json_decode($rule['action_config'], true);
                    $result = $this->executeAutomationAction($userId, $connectionId, $rule['action_type'], $actionConfig, $triggerData);

                    if ($result['success']) {
                        $executedRules[] = [
                            'rule_id' => $rule['rule_id'],
                            'rule_name' => $rule['rule_name'],
                            'action_type' => $rule['action_type'],
                            'result' => $result
                        ];

                        // Update execution count
                        $stmt = $this->db->prepare("
                            UPDATE crm_automation_rules
                            SET execution_count = execution_count + 1, last_execution_at = CURRENT_TIMESTAMP
                            WHERE rule_id = :rule_id
                        ");
                        $stmt->execute(['rule_id' => $rule['rule_id']]);
                    } else {
                        $errors[] = [
                            'rule_id' => $rule['rule_id'],
                            'error' => $result['message']
                        ];
                    }

                } catch (Exception $e) {
                    $errors[] = [
                        'rule_id' => $rule['rule_id'],
                        'error' => $e->getMessage()
                    ];
                }
            }

            return [
                'success' => true,
                'data' => [
                    'executed_rules' => $executedRules,
                    'errors' => $errors,
                    'total_rules_checked' => count($rules)
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to execute automation rules: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get CRM analytics
     */
    public function getCRMAnalytics(int $userId, string $connectionId, array $options = []): array
    {
        try {
            $dateRange = $options['date_range'] ?? 30; // days
            $startDate = date('Y-m-d', strtotime("-{$dateRange} days"));

            // Get analytics data
            $stmt = $this->db->prepare("
                SELECT * FROM crm_analytics
                WHERE user_id = :user_id AND connection_id = :connection_id
                AND date_period >= :start_date
                ORDER BY date_period DESC
            ");
            $stmt->execute([
                'user_id' => $userId,
                'connection_id' => $connectionId,
                'start_date' => $startDate
            ]);
            $analytics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate summary metrics
            $summary = [
                'total_contacts_synced' => array_sum(array_column($analytics, 'contacts_synced')),
                'total_leads_created' => array_sum(array_column($analytics, 'leads_created')),
                'total_deals_created' => array_sum(array_column($analytics, 'deals_created')),
                'total_activities_logged' => array_sum(array_column($analytics, 'activities_logged')),
                'total_sync_errors' => array_sum(array_column($analytics, 'sync_errors')),
                'average_conversion_rate' => count($analytics) > 0 ? array_sum(array_column($analytics, 'conversion_rate')) / count($analytics) : 0,
                'total_deal_value' => array_sum(array_column($analytics, 'total_deal_value')),
                'average_deal_size' => count($analytics) > 0 ? array_sum(array_column($analytics, 'average_deal_size')) / count($analytics) : 0
            ];

            return [
                'success' => true,
                'data' => [
                    'daily_analytics' => $analytics,
                    'summary' => $summary,
                    'date_range' => $dateRange
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get CRM analytics: ' . $e->getMessage()
            ];
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get connection details
     */
    private function getConnectionDetails(string $connectionId, int $userId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT c.*, a.app_name, a.api_base_url, a.oauth_token_url
            FROM user_app_connections c
            JOIN third_party_apps a ON c.app_id = a.app_id
            WHERE c.connection_id = :connection_id AND c.user_id = :user_id AND c.is_active = 1
        ");
        $stmt->execute(['connection_id' => $connectionId, 'user_id' => $userId]);
        $connection = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($connection) {
            $connection['token_data'] = json_decode($this->decrypt($connection['encrypted_tokens']), true);
        }

        return $connection ?: null;
    }

    /**
     * Get interview details
     */
    private function getInterviewDetails(string $interviewId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM interview_rooms WHERE id = :interview_id");
        $stmt->execute(['interview_id' => $interviewId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get lead details
     */
    private function getLeadDetails(string $leadId, int $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM crm_interview_leads WHERE lead_id = :lead_id AND user_id = :user_id");
        $stmt->execute(['lead_id' => $leadId, 'user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Calculate lead score based on interview data
     */
    private function calculateLeadScore(array $interview): int
    {
        $score = 50; // Base score

        // Interview completion adds points
        if ($interview['status'] === 'ended') {
            $score += 20;
        }

        // Interview duration adds points
        if (isset($interview['actual_start']) && isset($interview['actual_end'])) {
            $duration = strtotime($interview['actual_end']) - strtotime($interview['actual_start']);
            $minutes = $duration / 60;

            if ($minutes >= 30) $score += 15;
            if ($minutes >= 60) $score += 10;
        }

        // Guest engagement (placeholder - would use actual metrics)
        $score += rand(0, 15);

        return min(100, max(0, $score));
    }

    /**
     * Calculate interview duration in minutes
     */
    private function calculateInterviewDuration(array $interview): int
    {
        if (isset($interview['actual_start']) && isset($interview['actual_end'])) {
            $duration = strtotime($interview['actual_end']) - strtotime($interview['actual_start']);
            return max(0, intval($duration / 60));
        }

        return 0;
    }

    /**
     * Transform contact data using field mappings
     */
    private function transformContactData(string $connectionId, array $data, string $direction): array
    {
        // Get field mappings
        $stmt = $this->db->prepare("
            SELECT * FROM crm_field_mappings
            WHERE connection_id = :connection_id AND object_type = 'contact' AND is_active = 1
        ");
        $stmt->execute(['connection_id' => $connectionId]);
        $mappings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $transformed = [];

        foreach ($mappings as $mapping) {
            $sourceField = $direction === 'export' ? $mapping['local_field_name'] : $mapping['crm_field_name'];
            $targetField = $direction === 'export' ? $mapping['crm_field_name'] : $mapping['local_field_name'];

            if (isset($data[$sourceField])) {
                $transformed[$targetField] = $data[$sourceField];
            }
        }

        return $transformed;
    }

    /**
     * Evaluate automation conditions
     */
    private function evaluateConditions(array $conditions, array $data): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $field => $condition) {
            if (!isset($data[$field])) {
                return false;
            }

            $value = $data[$field];

            if (is_array($condition)) {
                foreach ($condition as $operator => $expected) {
                    switch ($operator) {
                        case '>=':
                            if (!($value >= $expected)) return false;
                            break;
                        case '<=':
                            if (!($value <= $expected)) return false;
                            break;
                        case '>':
                            if (!($value > $expected)) return false;
                            break;
                        case '<':
                            if (!($value < $expected)) return false;
                            break;
                        case '==':
                            if ($value != $expected) return false;
                            break;
                        case '!=':
                            if ($value == $expected) return false;
                            break;
                    }
                }
            } else {
                if ($value != $condition) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Execute automation action
     */
    private function executeAutomationAction(int $userId, string $connectionId, string $actionType, array $config, array $triggerData): array
    {
        switch ($actionType) {
            case 'create_contact':
                return $this->createContactInCRM($userId, $connectionId, array_merge($config, $triggerData));

            case 'create_activity':
                if (isset($triggerData['interview_id'])) {
                    return $this->logInterviewActivity($userId, $connectionId, $triggerData['interview_id'], $config);
                }
                break;

            case 'update_lead':
                if (isset($triggerData['lead_id'])) {
                    return $this->updateLeadInCRM($userId, $connectionId, $triggerData['lead_id'], $config);
                }
                break;

            case 'create_deal':
                if (isset($triggerData['lead_id'])) {
                    return $this->createDealFromLead($userId, $connectionId, $triggerData['lead_id'], $config);
                }
                break;
        }

        return [
            'success' => false,
            'message' => 'Unsupported action type or missing required data'
        ];
    }

    /**
     * Update sync analytics
     */
    private function updateSyncAnalytics(int $userId, string $connectionId, string $type, int $successCount, int $errorCount): void
    {
        $today = date('Y-m-d');

        $stmt = $this->db->prepare("
            INSERT INTO crm_analytics (
                analytics_id, user_id, connection_id, date_period,
                contacts_synced, sync_errors
            ) VALUES (
                :analytics_id, :user_id, :connection_id, :date_period,
                :contacts_synced, :sync_errors
            ) ON CONFLICT(user_id, connection_id, date_period) DO UPDATE SET
                contacts_synced = contacts_synced + :contacts_synced,
                sync_errors = sync_errors + :sync_errors
        ");

        $stmt->execute([
            'analytics_id' => 'analytics_' . uniqid(),
            'user_id' => $userId,
            'connection_id' => $connectionId,
            'date_period' => $today,
            'contacts_synced' => $type === 'contacts' ? $successCount : 0,
            'sync_errors' => $errorCount
        ]);
    }

    /**
     * Encrypt sensitive data
     */
    private function encrypt(string $data): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    private function decrypt(string $encryptedData): string
    {
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }

    // ==================== CRM API METHODS (Mock Implementation) ====================

    /**
     * Fetch contacts from CRM (mock implementation)
     */
    private function fetchContactsFromCRM(array $connection, int $limit, int $offset): array
    {
        // Mock implementation - in production, this would make actual API calls
        return [
            [
                'id' => 'contact_' . uniqid(),
                'email' => 'john.doe@example.com',
                'firstname' => 'John',
                'lastname' => 'Doe',
                'company' => 'Example Corp',
                'phone' => '+1-555-0123'
            ],
            [
                'id' => 'contact_' . uniqid(),
                'email' => 'jane.smith@example.com',
                'firstname' => 'Jane',
                'lastname' => 'Smith',
                'company' => 'Tech Solutions',
                'phone' => '+1-555-0124'
            ]
        ];
    }

    /**
     * Sync single contact (mock implementation)
     */
    private function syncSingleContact(int $userId, string $connectionId, array $crmContact, string $direction): array
    {
        // Mock implementation
        return [
            'success' => true,
            'conflict' => null
        ];
    }

    /**
     * Create contact in CRM (mock implementation)
     */
    private function createCRMContact(array $connection, array $contactData): array
    {
        // Mock implementation
        return [
            'success' => true,
            'data' => [
                'id' => 'contact_' . uniqid(),
                'email' => $contactData['email'] ?? '',
                'firstname' => $contactData['firstname'] ?? '',
                'lastname' => $contactData['lastname'] ?? ''
            ]
        ];
    }

    /**
     * Create lead in CRM (mock implementation)
     */
    private function createCRMLead(array $connection, array $leadData, array $interview): array
    {
        // Mock implementation
        return [
            'success' => true,
            'data' => [
                'id' => 'lead_' . uniqid(),
                'email' => $leadData['email'] ?? $interview['guest_email'] ?? '',
                'firstname' => $leadData['firstname'] ?? '',
                'lastname' => $leadData['lastname'] ?? '',
                'leadstatus' => $leadData['lead_status'] ?? 'new',
                'leadsource' => $leadData['lead_source'] ?? 'interview'
            ]
        ];
    }

    /**
     * Create deal in CRM (mock implementation)
     */
    private function createCRMDeal(array $connection, array $dealData, array $lead): array
    {
        // Mock implementation
        return [
            'success' => true,
            'data' => [
                'id' => 'deal_' . uniqid(),
                'dealname' => $dealData['deal_name'],
                'amount' => $dealData['deal_value'],
                'dealstage' => $dealData['deal_stage'],
                'probability' => $dealData['probability_percentage']
            ]
        ];
    }

    /**
     * Create activity in CRM (mock implementation)
     */
    private function createCRMActivity(array $connection, array $activityData, array $interview): array
    {
        // Mock implementation
        return [
            'success' => true,
            'data' => [
                'id' => 'activity_' . uniqid(),
                'subject' => $activityData['activity_subject'],
                'type' => $activityData['activity_type'],
                'date' => $activityData['activity_date'],
                'duration' => $activityData['activity_duration_minutes']
            ]
        ];
    }

    /**
     * Update lead in CRM (mock implementation)
     */
    private function updateLeadInCRM(int $userId, string $connectionId, string $leadId, array $updateData): array
    {
        // Mock implementation
        return [
            'success' => true,
            'data' => [
                'id' => $leadId,
                'updated_fields' => array_keys($updateData)
            ]
        ];
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'success' => true,
            'data' => [
                'sample_contacts' => [
                    [
                        'mapping_id' => 'mapping_demo_1',
                        'crm_contact_id' => 'contact_12345',
                        'contact_data' => [
                            'email' => 'john.doe@example.com',
                            'firstname' => 'John',
                            'lastname' => 'Doe',
                            'company' => 'Example Corp'
                        ],
                        'sync_status' => 'synced',
                        'last_sync_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
                    ]
                ],
                'sample_leads' => [
                    [
                        'lead_id' => 'lead_demo_1',
                        'crm_lead_id' => 'lead_67890',
                        'lead_status' => 'qualified',
                        'lead_score' => 85,
                        'estimated_value' => 15000,
                        'interview_title' => 'Senior Developer Interview'
                    ]
                ],
                'sample_deals' => [
                    [
                        'deal_id' => 'deal_demo_1',
                        'crm_deal_id' => 'deal_11111',
                        'deal_name' => 'Software Development Project',
                        'deal_stage' => 'proposal',
                        'deal_value' => 25000,
                        'probability_percentage' => 60
                    ]
                ],
                'sample_activities' => [
                    [
                        'activity_id' => 'activity_demo_1',
                        'crm_activity_id' => 'activity_22222',
                        'activity_type' => 'meeting',
                        'activity_subject' => 'Interview: Frontend Developer Position',
                        'activity_duration_minutes' => 45,
                        'activity_outcome' => 'completed'
                    ]
                ]
            ]
        ];
    }
}
