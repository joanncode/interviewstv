<?php

namespace App\Controllers;

use App\Services\SecurityValidationService;
use App\Config\SecurityConfig;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\AuthService;

class SecurityController
{
    private $securityValidator;
    private $authService;
    private $pdo;

    public function __construct()
    {
        $this->pdo = app('db');
        $this->securityValidator = new SecurityValidationService($this->pdo);
        $this->authService = new AuthService();
    }

    /**
     * Get security dashboard data
     */
    public function dashboard(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $dashboardData = [
                'critical_events' => $this->getCriticalEventsCount(),
                'failed_logins' => $this->getFailedLoginsCount(),
                'blocked_ips' => $this->getBlockedIPsCount(),
                'security_score' => $this->calculateSecurityScore(),
                'recent_events' => $this->getRecentSecurityEvents(20),
                'system_status' => $this->getSystemStatus()
            ];

            return Response::success($dashboardData);

        } catch (\Exception $e) {
            return Response::error('Failed to load security dashboard: ' . $e->getMessage());
        }
    }

    /**
     * Report security event from frontend
     */
    public function reportEvent(Request $request)
    {
        try {
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('type')
                ->required('timestamp')
                ->max('type', 100)
                ->max('url', 500);

            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            // Log the security event
            $this->securityValidator->logSecurityEvent($data['type'], [
                'frontend_data' => $data,
                'user_id' => $request->user()['id'] ?? null
            ]);

            return Response::success(null, 'Security event reported');

        } catch (\Exception $e) {
            return Response::error('Failed to report security event: ' . $e->getMessage());
        }
    }

    /**
     * Ban IP address
     */
    public function banIP(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('ip_address')
                ->required('reason')
                ->ip('ip_address')
                ->max('reason', 500)
                ->numeric('duration_hours');

            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            $expiresAt = null;
            if (isset($data['duration_hours']) && $data['duration_hours'] > 0) {
                $expiresAt = date('Y-m-d H:i:s', time() + ($data['duration_hours'] * 3600));
            }

            // Insert banned IP
            $stmt = $this->pdo->prepare("
                INSERT INTO banned_ips (ip_address, reason, banned_by, expires_at, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                reason = VALUES(reason), 
                banned_by = VALUES(banned_by), 
                expires_at = VALUES(expires_at), 
                updated_at = NOW()
            ");

            $stmt->execute([
                $data['ip_address'],
                $data['reason'],
                $currentUser['id'],
                $expiresAt
            ]);

            // Log the action
            $this->securityValidator->logSecurityEvent('ip_banned', [
                'ip_address' => $data['ip_address'],
                'reason' => $data['reason'],
                'banned_by' => $currentUser['id'],
                'expires_at' => $expiresAt
            ]);

            return Response::success(null, 'IP address banned successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to ban IP address: ' . $e->getMessage());
        }
    }

    /**
     * Unban IP address
     */
    public function unbanIP(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $ipAddress = $request->route('ip');
            
            if (!filter_var($ipAddress, FILTER_VALIDATE_IP)) {
                return Response::error('Invalid IP address', 400);
            }

            // Remove from banned IPs
            $stmt = $this->pdo->prepare("UPDATE banned_ips SET is_active = 0 WHERE ip_address = ?");
            $stmt->execute([$ipAddress]);

            // Log the action
            $this->securityValidator->logSecurityEvent('ip_unbanned', [
                'ip_address' => $ipAddress,
                'unbanned_by' => $currentUser['id']
            ]);

            return Response::success(null, 'IP address unbanned successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to unban IP address: ' . $e->getMessage());
        }
    }

    /**
     * Get security configuration
     */
    public function getConfig(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $config = SecurityConfig::getConfigWithOverrides();
            
            // Remove sensitive information
            unset($config['encryption']);
            
            return Response::success($config);

        } catch (\Exception $e) {
            return Response::error('Failed to get security configuration: ' . $e->getMessage());
        }
    }

    /**
     * Export security report
     */
    public function exportReport(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $dateRange = $request->query('date_range', '30 days');
            
            $report = [
                'generated_at' => date('Y-m-d H:i:s'),
                'generated_by' => $currentUser['name'],
                'date_range' => $dateRange,
                'summary' => [
                    'total_events' => $this->getTotalEventsCount($dateRange),
                    'critical_events' => $this->getCriticalEventsCount($dateRange),
                    'failed_logins' => $this->getFailedLoginsCount($dateRange),
                    'blocked_ips' => $this->getBlockedIPsCount(),
                    'security_score' => $this->calculateSecurityScore()
                ],
                'events_by_type' => $this->getEventsByType($dateRange),
                'events_by_severity' => $this->getEventsBySeverity($dateRange),
                'top_threat_ips' => $this->getTopThreatIPs($dateRange),
                'recent_events' => $this->getRecentSecurityEvents(100, $dateRange)
            ];

            return Response::success($report);

        } catch (\Exception $e) {
            return Response::error('Failed to export security report: ' . $e->getMessage());
        }
    }

    /**
     * Clear old security logs
     */
    public function clearOldLogs(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check admin permissions
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $retentionDays = SecurityConfig::get('logging', 'retention_days') ?: 90;
            $cutoffDate = date('Y-m-d H:i:s', time() - ($retentionDays * 24 * 3600));

            // Clear old security logs
            $stmt = $this->pdo->prepare("DELETE FROM security_logs WHERE created_at < ?");
            $stmt->execute([$cutoffDate]);
            $deletedLogs = $stmt->rowCount();

            // Clear old failed login attempts
            $stmt = $this->pdo->prepare("DELETE FROM failed_login_attempts WHERE created_at < ?");
            $stmt->execute([$cutoffDate]);
            $deletedAttempts = $stmt->rowCount();

            // Clear old rate limit entries
            $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE created_at < ?");
            $stmt->execute([$cutoffDate]);
            $deletedRateLimits = $stmt->rowCount();

            // Log the cleanup action
            $this->securityValidator->logSecurityEvent('logs_cleared', [
                'deleted_logs' => $deletedLogs,
                'deleted_attempts' => $deletedAttempts,
                'deleted_rate_limits' => $deletedRateLimits,
                'retention_days' => $retentionDays,
                'cleared_by' => $currentUser['id']
            ]);

            return Response::success([
                'deleted_logs' => $deletedLogs,
                'deleted_attempts' => $deletedAttempts,
                'deleted_rate_limits' => $deletedRateLimits
            ], 'Old logs cleared successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to clear old logs: ' . $e->getMessage());
        }
    }

    /**
     * Get critical events count
     */
    private function getCriticalEventsCount($dateRange = '24 hours')
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM security_logs 
            WHERE severity = 'critical' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
        ");
        $stmt->execute();
        return $stmt->fetchColumn();
    }

    /**
     * Get failed logins count
     */
    private function getFailedLoginsCount($dateRange = '24 hours')
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM failed_login_attempts 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
        ");
        $stmt->execute();
        return $stmt->fetchColumn();
    }

    /**
     * Get blocked IPs count
     */
    private function getBlockedIPsCount()
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM banned_ips 
            WHERE is_active = 1 
            AND (expires_at IS NULL OR expires_at > NOW())
        ");
        $stmt->execute();
        return $stmt->fetchColumn();
    }

    /**
     * Calculate security score
     */
    private function calculateSecurityScore()
    {
        $score = 100;
        
        // Deduct points for recent critical events
        $criticalEvents = $this->getCriticalEventsCount('7 days');
        $score -= min($criticalEvents * 5, 30);
        
        // Deduct points for failed logins
        $failedLogins = $this->getFailedLoginsCount('24 hours');
        $score -= min($failedLogins * 2, 20);
        
        // Check security features
        $config = SecurityConfig::getConfig();
        if (!$config['api']['require_https']) $score -= 10;
        if (!$config['csrf']['require_for_all_posts']) $score -= 10;
        if (!$config['logging']['log_security_events']) $score -= 5;
        
        return max(0, $score);
    }

    /**
     * Get recent security events
     */
    private function getRecentSecurityEvents($limit = 20, $dateRange = '24 hours')
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM security_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get system status
     */
    private function getSystemStatus()
    {
        $config = SecurityConfig::getConfig();
        
        return [
            'https_enabled' => $config['api']['require_https'],
            'csrf_protection' => $config['csrf']['require_for_all_posts'],
            'rate_limiting' => true,
            'security_headers' => true,
            'input_validation' => true,
            'logging_enabled' => $config['logging']['log_security_events']
        ];
    }

    /**
     * Get total events count
     */
    private function getTotalEventsCount($dateRange = '30 days')
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM security_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
        ");
        $stmt->execute();
        return $stmt->fetchColumn();
    }

    /**
     * Get events by type
     */
    private function getEventsByType($dateRange = '30 days')
    {
        $stmt = $this->pdo->prepare("
            SELECT event_type, COUNT(*) as count 
            FROM security_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
            GROUP BY event_type 
            ORDER BY count DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get events by severity
     */
    private function getEventsBySeverity($dateRange = '30 days')
    {
        $stmt = $this->pdo->prepare("
            SELECT severity, COUNT(*) as count 
            FROM security_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
            GROUP BY severity 
            ORDER BY count DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get top threat IPs
     */
    private function getTopThreatIPs($dateRange = '30 days', $limit = 10)
    {
        $stmt = $this->pdo->prepare("
            SELECT ip_address, COUNT(*) as threat_count 
            FROM security_logs 
            WHERE ip_address IS NOT NULL 
            AND created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
            GROUP BY ip_address 
            ORDER BY threat_count DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
