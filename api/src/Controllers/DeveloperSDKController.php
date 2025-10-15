<?php

namespace App\Controllers;

use App\Services\DeveloperSDKService;
use Exception;

/**
 * Developer SDK Controller
 * 
 * Handles SDK management endpoints, downloads, code examples, and developer tools
 * for the Interviews.tv integration platform.
 */
class DeveloperSDKController
{
    private DeveloperSDKService $sdkService;

    public function __construct(DeveloperSDKService $sdkService)
    {
        $this->sdkService = $sdkService;
    }

    /**
     * Get available SDK versions
     * GET /api/sdk/versions
     */
    public function getVersions(): void
    {
        try {
            $options = [
                'language' => $_GET['language'] ?? '',
                'include_deprecated' => isset($_GET['include_deprecated']) ? (bool)$_GET['include_deprecated'] : false,
                'release_type' => $_GET['release_type'] ?? ''
            ];

            $result = $this->sdkService->getSDKVersions($options);
            
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
     * Download SDK version
     * GET /api/sdk/download/{versionId}
     */
    public function downloadVersion(): void
    {
        try {
            $versionId = $_GET['version_id'] ?? '';
            
            if (empty($versionId)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Version ID is required'
                ]);
                return;
            }

            // Track the download
            $downloadData = [
                'version_id' => $versionId,
                'user_id' => $_GET['user_id'] ?? null,
                'download_type' => $_GET['type'] ?? 'direct'
            ];

            $trackResult = $this->sdkService->trackDownload($downloadData);
            
            if (!$trackResult['success']) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode($trackResult);
                return;
            }

            // In a real implementation, this would redirect to the actual download URL
            // For demo purposes, we'll return download information
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => [
                    'download_id' => $trackResult['data']['download_id'],
                    'download_url' => "https://cdn.interviews.tv/sdk/download/{$versionId}",
                    'message' => 'Download tracked successfully'
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
     * Get code examples
     * GET /api/sdk/examples
     */
    public function getCodeExamples(): void
    {
        try {
            $options = [
                'language' => $_GET['language'] ?? '',
                'category' => $_GET['category'] ?? '',
                'complexity' => $_GET['complexity'] ?? '',
                'featured' => isset($_GET['featured']) ? (bool)$_GET['featured'] : false
            ];

            $result = $this->sdkService->getCodeExamples($options);
            
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
     * Get SDK documentation
     * GET /api/sdk/documentation
     */
    public function getDocumentation(): void
    {
        try {
            $options = [
                'language' => $_GET['language'] ?? '',
                'section' => $_GET['section'] ?? ''
            ];

            $result = $this->sdkService->getDocumentation($options);
            
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
     * Get SDK integrations
     * GET /api/sdk/integrations
     */
    public function getIntegrations(): void
    {
        try {
            $options = [
                'language' => $_GET['language'] ?? '',
                'framework' => $_GET['framework'] ?? '',
                'category' => $_GET['category'] ?? '',
                'featured' => isset($_GET['featured']) ? (bool)$_GET['featured'] : false
            ];

            $result = $this->sdkService->getIntegrations($options);
            
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
     * Get performance metrics
     * GET /api/sdk/metrics
     */
    public function getPerformanceMetrics(): void
    {
        try {
            $options = [
                'language' => $_GET['language'] ?? '',
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d')
            ];

            $result = $this->sdkService->getPerformanceMetrics($options);
            
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
     * Get supported languages
     * GET /api/sdk/languages
     */
    public function getSupportedLanguages(): void
    {
        try {
            $languages = [
                'javascript' => [
                    'name' => 'JavaScript/Node.js',
                    'icon' => 'fab fa-js-square',
                    'color' => '#f7df1e',
                    'package_manager' => 'npm',
                    'install_command' => 'npm install @interviews-tv/sdk'
                ],
                'python' => [
                    'name' => 'Python',
                    'icon' => 'fab fa-python',
                    'color' => '#3776ab',
                    'package_manager' => 'pip',
                    'install_command' => 'pip install interviews-tv-sdk'
                ],
                'php' => [
                    'name' => 'PHP',
                    'icon' => 'fab fa-php',
                    'color' => '#777bb4',
                    'package_manager' => 'composer',
                    'install_command' => 'composer require interviews-tv/sdk'
                ],
                'java' => [
                    'name' => 'Java',
                    'icon' => 'fab fa-java',
                    'color' => '#ed8b00',
                    'package_manager' => 'maven',
                    'install_command' => 'Add to pom.xml: com.interviews-tv:sdk:1.0.0'
                ],
                'csharp' => [
                    'name' => 'C#/.NET',
                    'icon' => 'fab fa-microsoft',
                    'color' => '#239120',
                    'package_manager' => 'nuget',
                    'install_command' => 'Install-Package InterviewsTV.SDK'
                ],
                'ruby' => [
                    'name' => 'Ruby',
                    'icon' => 'fas fa-gem',
                    'color' => '#cc342d',
                    'package_manager' => 'gem',
                    'install_command' => 'gem install interviews_tv_sdk'
                ],
                'go' => [
                    'name' => 'Go',
                    'icon' => 'fab fa-golang',
                    'color' => '#00add8',
                    'package_manager' => 'go mod',
                    'install_command' => 'go get github.com/interviews-tv/sdk-go'
                ]
            ];
            
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => $languages
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
     * Get demo data for testing
     * GET /api/sdk/demo-data
     */
    public function getDemoData(): void
    {
        try {
            $result = $this->sdkService->getDemoData();
            
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
     * Get SDK health status
     * GET /api/sdk/health
     */
    public function getHealthStatus(): void
    {
        try {
            $health = [
                'status' => 'healthy',
                'timestamp' => date('c'),
                'sdk_versions' => 8,
                'supported_languages' => 7,
                'total_downloads' => 45230,
                'active_developers' => 1250,
                'uptime_percent' => 99.9
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
