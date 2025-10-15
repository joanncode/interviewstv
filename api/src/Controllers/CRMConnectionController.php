<?php

namespace App\Controllers;

use App\Services\CRMConnectionService;
use PDO;

/**
 * CRM Connection Controller
 * Handles REST API endpoints for CRM system integrations
 */
class CRMConnectionController
{
    private $crmService;

    public function __construct(PDO $db)
    {
        $this->crmService = new CRMConnectionService($db);
    }

    // ==================== CONTACT MANAGEMENT ====================

    /**
     * Sync contacts from CRM
     * POST /api/crm/contacts/sync
     */
    public function syncContacts(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $options = $input['options'] ?? [];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->syncContactsFromCRM($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to sync contacts: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create contact in CRM
     * POST /api/crm/contacts
     */
    public function createContact(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $contactData = $input['contact_data'] ?? [];

            if (empty($connectionId) || empty($contactData)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID and contact data are required'
                ], 400);
                return;
            }

            $result = $this->crmService->createContactInCRM($userId, $connectionId, $contactData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to create contact: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get contact mappings
     * GET /api/crm/contacts/mappings
     */
    public function getContactMappings(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_GET['connection_id'] ?? '';
            $options = [
                'sync_status' => $_GET['sync_status'] ?? null,
                'limit' => intval($_GET['limit'] ?? 50),
                'offset' => intval($_GET['offset'] ?? 0)
            ];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->getContactMappings($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get contact mappings: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================== LEAD MANAGEMENT ====================

    /**
     * Create lead from interview
     * POST /api/crm/leads/from-interview
     */
    public function createLeadFromInterview(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $interviewId = $input['interview_id'] ?? '';
            $leadData = $input['lead_data'] ?? [];

            if (empty($connectionId) || empty($interviewId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID and interview ID are required'
                ], 400);
                return;
            }

            $result = $this->crmService->createLeadFromInterview($userId, $connectionId, $interviewId, $leadData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to create lead from interview: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get interview leads
     * GET /api/crm/leads
     */
    public function getInterviewLeads(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_GET['connection_id'] ?? '';
            $options = [
                'lead_status' => $_GET['lead_status'] ?? null,
                'interview_id' => $_GET['interview_id'] ?? null,
                'limit' => intval($_GET['limit'] ?? 50),
                'offset' => intval($_GET['offset'] ?? 0)
            ];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->getInterviewLeads($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get interview leads: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================== DEAL MANAGEMENT ====================

    /**
     * Create deal from lead
     * POST /api/crm/deals/from-lead
     */
    public function createDealFromLead(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $leadId = $input['lead_id'] ?? '';
            $dealData = $input['deal_data'] ?? [];

            if (empty($connectionId) || empty($leadId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID and lead ID are required'
                ], 400);
                return;
            }

            $result = $this->crmService->createDealFromLead($userId, $connectionId, $leadId, $dealData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to create deal from lead: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get CRM deals
     * GET /api/crm/deals
     */
    public function getCRMDeals(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_GET['connection_id'] ?? '';
            $options = [
                'deal_stage' => $_GET['deal_stage'] ?? null,
                'limit' => intval($_GET['limit'] ?? 50),
                'offset' => intval($_GET['offset'] ?? 0)
            ];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->getCRMDeals($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get CRM deals: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================== ACTIVITY LOGGING ====================

    /**
     * Log interview activity
     * POST /api/crm/activities/log-interview
     */
    public function logInterviewActivity(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $interviewId = $input['interview_id'] ?? '';
            $activityData = $input['activity_data'] ?? [];

            if (empty($connectionId) || empty($interviewId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID and interview ID are required'
                ], 400);
                return;
            }

            $result = $this->crmService->logInterviewActivity($userId, $connectionId, $interviewId, $activityData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to log interview activity: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get activity logs
     * GET /api/crm/activities
     */
    public function getActivityLogs(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_GET['connection_id'] ?? '';
            $options = [
                'activity_type' => $_GET['activity_type'] ?? null,
                'interview_id' => $_GET['interview_id'] ?? null,
                'limit' => intval($_GET['limit'] ?? 50),
                'offset' => intval($_GET['offset'] ?? 0)
            ];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->getActivityLogs($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get activity logs: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================== AUTOMATION & ANALYTICS ====================

    /**
     * Execute automation rules
     * POST /api/crm/automation/execute
     */
    public function executeAutomationRules(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $this->getCurrentUserId();

            $connectionId = $input['connection_id'] ?? '';
            $triggerEvent = $input['trigger_event'] ?? '';
            $triggerData = $input['trigger_data'] ?? [];

            if (empty($connectionId) || empty($triggerEvent)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID and trigger event are required'
                ], 400);
                return;
            }

            $result = $this->crmService->executeAutomationRules($userId, $connectionId, $triggerEvent, $triggerData);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to execute automation rules: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get CRM analytics
     * GET /api/crm/analytics
     */
    public function getCRMAnalytics(): void
    {
        try {
            $userId = $this->getCurrentUserId();
            $connectionId = $_GET['connection_id'] ?? '';
            $options = [
                'date_range' => intval($_GET['date_range'] ?? 30)
            ];

            if (empty($connectionId)) {
                $this->sendJsonResponse([
                    'success' => false,
                    'message' => 'Connection ID is required'
                ], 400);
                return;
            }

            $result = $this->crmService->getCRMAnalytics($userId, $connectionId, $options);
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get CRM analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get demo data
     * GET /api/crm/demo-data
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->crmService->getDemoData();
            $this->sendJsonResponse($result);

        } catch (Exception $e) {
            $this->sendJsonResponse([
                'success' => false,
                'message' => 'Failed to get demo data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user ID from JWT token
     */
    private function getCurrentUserId(): int
    {
        // For demo purposes, return a default user ID
        // In production, this would extract the user ID from the JWT token
        return 1;
    }

    /**
     * Send JSON response
     */
    private function sendJsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
