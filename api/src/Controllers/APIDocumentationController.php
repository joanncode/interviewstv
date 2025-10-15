<?php

namespace App\Controllers;

use App\Services\APIDocumentationService;
use Exception;

/**
 * API Documentation Controller
 * 
 * Handles API documentation endpoints, usage analytics, and developer tools
 * for the Interviews.tv integration platform.
 */
class APIDocumentationController
{
    private APIDocumentationService $apiDocumentationService;

    public function __construct(APIDocumentationService $apiDocumentationService)
    {
        $this->apiDocumentationService = $apiDocumentationService;
    }

    /**
     * Get API documentation sections
     * GET /api/docs/sections
     */
    public function getSections(): void
    {
        try {
            $options = [
                'search' => $_GET['search'] ?? '',
                'category' => $_GET['category'] ?? '',
                'include_deprecated' => isset($_GET['include_deprecated']) ? (bool)$_GET['include_deprecated'] : false
            ];

            $result = $this->apiDocumentationService->getDocumentationSections($options);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get endpoints for a specific section
     * GET /api/docs/sections/{sectionId}/endpoints
     */
    public function getSectionEndpoints(): void
    {
        try {
            $sectionId = $_GET['section_id'] ?? '';
            
            if (empty($sectionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Section ID is required'
                ]);
                return;
            }

            $options = [
                'include_deprecated' => isset($_GET['include_deprecated']) ? (bool)$_GET['include_deprecated'] : false
            ];

            $endpoints = $this->apiDocumentationService->getSectionEndpoints($sectionId, $options);
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => $endpoints,
                'section_id' => $sectionId
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get endpoint details including parameters and responses
     * GET /api/docs/endpoints/{endpointId}
     */
    public function getEndpointDetails(): void
    {
        try {
            $endpointId = $_GET['endpoint_id'] ?? '';
            
            if (empty($endpointId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Endpoint ID is required'
                ]);
                return;
            }

            $parameters = $this->apiDocumentationService->getEndpointParameters($endpointId);
            $responses = $this->apiDocumentationService->getEndpointResponses($endpointId);
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => [
                    'endpoint_id' => $endpointId,
                    'parameters' => $parameters,
                    'responses' => $responses
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get API usage analytics
     * GET /api/docs/analytics
     */
    public function getUsageAnalytics(): void
    {
        try {
            // Mock user ID for demo - in production, get from authentication
            $userId = 1;
            
            $options = [
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d'),
                'endpoint_id' => $_GET['endpoint_id'] ?? null
            ];

            $result = $this->apiDocumentationService->getUsageAnalytics($userId, $options);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Track documentation view
     * POST /api/docs/track-view
     */
    public function trackView(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON input'
                ]);
                return;
            }

            // Mock user ID for demo - in production, get from authentication
            $input['user_id'] = 1;
            
            $result = $this->apiDocumentationService->trackDocumentationView($input);
            
            http_response_code($result['success'] ? 201 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get OpenAPI specification
     * GET /api/docs/openapi
     */
    public function getOpenAPISpec(): void
    {
        try {
            $spec = $this->apiDocumentationService->getOpenAPISpec();
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode($spec);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Search API documentation
     * GET /api/docs/search
     */
    public function searchDocumentation(): void
    {
        try {
            $query = $_GET['q'] ?? '';
            
            if (empty($query)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Search query is required'
                ]);
                return;
            }

            $options = [
                'search' => $query,
                'include_deprecated' => isset($_GET['include_deprecated']) ? (bool)$_GET['include_deprecated'] : false
            ];

            $result = $this->apiDocumentationService->getDocumentationSections($options);
            
            http_response_code($result['success'] ? 200 : 400);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get demo data for testing
     * GET /api/docs/demo-data
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->apiDocumentationService->getDemoData();
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode($result);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get API health status
     * GET /api/docs/health
     */
    public function getHealthStatus(): void
    {
        try {
            $health = [
                'status' => 'healthy',
                'timestamp' => date('c'),
                'version' => '1.0.0',
                'uptime' => sys_getloadavg()[0],
                'endpoints_available' => 150,
                'documentation_sections' => 6
            ];
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => $health
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ]);
        }
    }
}
