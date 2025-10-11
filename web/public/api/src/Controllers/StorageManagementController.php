<?php

namespace App\Controllers;

use App\Services\VideoStorageService;
use App\Services\AuthService;

class StorageManagementController
{
    private $storageService;
    private $authService;

    public function __construct()
    {
        require_once __DIR__ . '/../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->storageService = new VideoStorageService($pdo);
        $this->authService = new AuthService($pdo);
    }

    /**
     * Get storage analytics for user
     * GET /api/storage/analytics
     */
    public function getStorageAnalytics()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->storageService->getStorageAnalytics($user['id']);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get storage statistics for user
     * GET /api/storage/stats
     */
    public function getStorageStats()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->storageService->getStorageStats($user['id']);
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enforce storage quota for user
     * POST /api/storage/enforce-quota
     */
    public function enforceStorageQuota()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = $this->storageService->enforceStorageQuota($user['id']);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cleanup old files
     * POST /api/storage/cleanup
     */
    public function cleanupOldFiles()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $daysOld = $input['days_old'] ?? null;

            $result = $this->storageService->cleanupOldFiles($daysOld);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Optimize storage by compressing old files
     * POST /api/storage/optimize
     */
    public function optimizeStorage()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $daysOld = $input['days_old'] ?? 30;

            $result = $this->storageService->optimizeStorage($daysOld);
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update storage statistics (admin only)
     * POST /api/storage/update-statistics
     */
    public function updateStorageStatistics()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Check if user is admin (you may want to implement proper role checking)
            if (!$this->isAdmin($user['id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Admin access required'
                ], 403);
            }

            $result = $this->storageService->updateStorageStatistics();
            
            return $this->jsonResponse($result, $result['success'] ? 200 : 400);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system-wide storage analytics (admin only)
     * GET /api/storage/system-analytics
     */
    public function getSystemStorageAnalytics()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Check if user is admin
            if (!$this->isAdmin($user['id'])) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Admin access required'
                ], 403);
            }

            $result = $this->storageService->getStorageAnalytics(); // No user ID = system-wide
            
            return $this->jsonResponse($result);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get storage health report
     * GET /api/storage/health
     */
    public function getStorageHealth()
    {
        try {
            $user = $this->authService->getCurrentUser();
            if (!$user) {
                return $this->jsonResponse([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            // Get user storage stats
            $userStats = $this->storageService->getStorageStats($user['id']);
            
            if (!$userStats['success']) {
                throw new Exception('Failed to get storage stats');
            }

            $stats = $userStats['data'];
            $health = [
                'overall_score' => 100,
                'issues' => [],
                'recommendations' => [],
                'quota_usage' => [
                    'percentage' => $stats['quota_usage_percent'],
                    'status' => 'healthy'
                ],
                'file_distribution' => [
                    'status' => 'healthy',
                    'large_files_count' => 0
                ],
                'cleanup_needed' => false
            ];

            // Check quota usage
            if ($stats['quota_usage_percent'] > 90) {
                $health['overall_score'] -= 30;
                $health['quota_usage']['status'] = 'critical';
                $health['issues'][] = 'Storage quota critically high (>90%)';
                $health['recommendations'][] = 'Delete old recordings or increase quota';
                $health['cleanup_needed'] = true;
            } elseif ($stats['quota_usage_percent'] > 75) {
                $health['overall_score'] -= 15;
                $health['quota_usage']['status'] = 'warning';
                $health['issues'][] = 'Storage quota high (>75%)';
                $health['recommendations'][] = 'Consider cleaning up old files';
            }

            // Check for large files
            require_once __DIR__ . '/../config/database.php';
            $database = new \Database();
            $pdo = $database->getConnection();

            $largeFilesStmt = $pdo->prepare("
                SELECT COUNT(*) as count
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? 
                AND vf.deleted_at IS NULL 
                AND vf.file_size > ?
            ");
            $largeFilesStmt->execute([$user['id'], 500 * 1024 * 1024]); // Files > 500MB
            $largeFilesCount = $largeFilesStmt->fetch()['count'];

            if ($largeFilesCount > 5) {
                $health['overall_score'] -= 10;
                $health['file_distribution']['status'] = 'warning';
                $health['file_distribution']['large_files_count'] = $largeFilesCount;
                $health['issues'][] = "Many large files detected ({$largeFilesCount} files > 500MB)";
                $health['recommendations'][] = 'Consider compressing large files to save space';
            }

            // Check for old files
            $oldFilesStmt = $pdo->prepare("
                SELECT COUNT(*) as count
                FROM video_files vf
                JOIN interview_recordings ir ON vf.recording_id = ir.id
                WHERE ir.host_user_id = ? 
                AND vf.deleted_at IS NULL 
                AND vf.created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
            ");
            $oldFilesStmt->execute([$user['id']]);
            $oldFilesCount = $oldFilesStmt->fetch()['count'];

            if ($oldFilesCount > 10) {
                $health['overall_score'] -= 5;
                $health['issues'][] = "Many old files detected ({$oldFilesCount} files > 90 days old)";
                $health['recommendations'][] = 'Archive or delete old recordings you no longer need';
                $health['cleanup_needed'] = true;
            }

            // Set overall status
            if ($health['overall_score'] >= 80) {
                $health['status'] = 'healthy';
            } elseif ($health['overall_score'] >= 60) {
                $health['status'] = 'warning';
            } else {
                $health['status'] = 'critical';
            }

            return $this->jsonResponse([
                'success' => true,
                'data' => $health
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user is admin (placeholder - implement proper role checking)
     */
    private function isAdmin(int $userId): bool
    {
        // Placeholder implementation - you should implement proper role checking
        // For now, assume user ID 1 is admin
        return $userId === 1;
    }

    /**
     * JSON response helper
     */
    private function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
