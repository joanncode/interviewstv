<?php

namespace App\Services;

class SecurityMonitor
{
    private $pdo;
    private $alertThresholds;
    private $monitoringEnabled = true;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->setupAlertThresholds();
    }
    
    /**
     * Log security event
     */
    public function logSecurityEvent($eventType, $severity, $data = [], $userId = null)
    {
        if (!$this->monitoringEnabled) {
            return;
        }
        
        try {
            $sql = "INSERT INTO security_events (
                        event_type, severity, user_id, ip_address, user_agent, 
                        event_data, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $eventType,
                $severity,
                $userId,
                $this->getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? '',
                json_encode($data)
            ]);
            
            // Check if this event triggers an alert
            $this->checkAlertThresholds($eventType, $severity);
            
        } catch (\PDOException $e) {
            error_log("Failed to log security event: " . $e->getMessage());
        }
    }
    
    /**
     * Monitor failed login attempts
     */
    public function monitorFailedLogins($email, $ip = null)
    {
        $ip = $ip ?: $this->getClientIp();
        
        // Count recent failed attempts for this email
        $emailAttempts = $this->getRecentFailedAttempts('email', $email, 300); // 5 minutes
        
        // Count recent failed attempts for this IP
        $ipAttempts = $this->getRecentFailedAttempts('ip', $ip, 300);
        
        $data = [
            'email' => $email,
            'ip' => $ip,
            'email_attempts' => $emailAttempts,
            'ip_attempts' => $ipAttempts
        ];
        
        if ($emailAttempts >= 5) {
            $this->logSecurityEvent('multiple_failed_logins_email', 'high', $data);
        }
        
        if ($ipAttempts >= 10) {
            $this->logSecurityEvent('multiple_failed_logins_ip', 'critical', $data);
        }
        
        // Log the failed attempt
        $this->logSecurityEvent('failed_login', 'medium', $data);
    }
    
    /**
     * Monitor suspicious activity patterns
     */
    public function monitorSuspiciousActivity($userId, $activityType, $data = [])
    {
        $patterns = [
            'rapid_requests' => $this->detectRapidRequests($userId),
            'unusual_location' => $this->detectUnusualLocation($userId),
            'privilege_escalation' => $this->detectPrivilegeEscalation($userId, $activityType),
            'data_exfiltration' => $this->detectDataExfiltration($userId, $activityType, $data)
        ];
        
        foreach ($patterns as $pattern => $detected) {
            if ($detected) {
                $this->logSecurityEvent("suspicious_activity_{$pattern}", 'high', [
                    'user_id' => $userId,
                    'activity_type' => $activityType,
                    'pattern' => $pattern,
                    'data' => $data
                ], $userId);
            }
        }
    }
    
    /**
     * Monitor file upload security
     */
    public function monitorFileUpload($userId, $filename, $filesize, $mimetype)
    {
        $suspicious = false;
        $reasons = [];
        
        // Check file extension
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $dangerousExtensions = ['php', 'exe', 'bat', 'cmd', 'scr', 'pif', 'vbs', 'js'];
        
        if (in_array($extension, $dangerousExtensions)) {
            $suspicious = true;
            $reasons[] = 'dangerous_file_extension';
        }
        
        // Check file size
        if ($filesize > 50 * 1024 * 1024) { // 50MB
            $suspicious = true;
            $reasons[] = 'large_file_size';
        }
        
        // Check MIME type mismatch
        $expectedMimes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'pdf' => 'application/pdf'
        ];
        
        if (isset($expectedMimes[$extension]) && $mimetype !== $expectedMimes[$extension]) {
            $suspicious = true;
            $reasons[] = 'mime_type_mismatch';
        }
        
        if ($suspicious) {
            $this->logSecurityEvent('suspicious_file_upload', 'high', [
                'filename' => $filename,
                'filesize' => $filesize,
                'mimetype' => $mimetype,
                'reasons' => $reasons
            ], $userId);
        }
    }
    
    /**
     * Monitor SQL injection attempts
     */
    public function monitorSqlInjection($input, $userId = null)
    {
        $sqlPatterns = [
            '/(\s|^)(union|select|insert|update|delete|drop|create|alter)\s/i',
            '/(\s|^)(or|and)\s+\d+\s*=\s*\d+/i',
            '/(\s|^)(or|and)\s+["\']?\w+["\']?\s*=\s*["\']?\w+["\']?/i',
            '/--/',
            '/\/\*.*?\*\//',
            '/;/',
            '/\bexec\b/i',
            '/\bexecute\b/i'
        ];
        
        foreach ($sqlPatterns as $pattern) {
            if (preg_match($pattern, $input)) {
                $this->logSecurityEvent('sql_injection_attempt', 'critical', [
                    'input' => substr($input, 0, 500), // Limit logged input
                    'pattern' => $pattern,
                    'url' => $_SERVER['REQUEST_URI'] ?? '',
                    'method' => $_SERVER['REQUEST_METHOD'] ?? ''
                ], $userId);
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Monitor XSS attempts
     */
    public function monitorXssAttempts($input, $userId = null)
    {
        $xssPatterns = [
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
            '/\bon\w+\s*=\s*["\']?[^"\'>\s]*["\']?/i',
            '/javascript\s*:/i',
            '/data\s*:/i',
            '/vbscript\s*:/i',
            '/<iframe\b[^>]*>/i',
            '/<object\b[^>]*>/i',
            '/<embed\b[^>]*>/i'
        ];
        
        foreach ($xssPatterns as $pattern) {
            if (preg_match($pattern, $input)) {
                $this->logSecurityEvent('xss_attempt', 'high', [
                    'input' => substr($input, 0, 500),
                    'pattern' => $pattern,
                    'url' => $_SERVER['REQUEST_URI'] ?? '',
                    'method' => $_SERVER['REQUEST_METHOD'] ?? ''
                ], $userId);
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Monitor CSRF attacks
     */
    public function monitorCsrfAttacks($userId = null)
    {
        $this->logSecurityEvent('csrf_attack', 'high', [
            'referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'url' => $_SERVER['REQUEST_URI'] ?? '',
            'method' => $_SERVER['REQUEST_METHOD'] ?? ''
        ], $userId);
    }
    
    /**
     * Get security dashboard data
     */
    public function getSecurityDashboard($timeframe = '24h')
    {
        $hours = $this->parseTimeframe($timeframe);
        $since = date('Y-m-d H:i:s', time() - ($hours * 3600));
        
        return [
            'summary' => $this->getSecuritySummary($since),
            'events_by_type' => $this->getEventsByType($since),
            'events_by_severity' => $this->getEventsBySeverity($since),
            'top_threats' => $this->getTopThreats($since),
            'geographic_data' => $this->getGeographicData($since),
            'timeline' => $this->getSecurityTimeline($since)
        ];
    }
    
    /**
     * Get security alerts
     */
    public function getActiveAlerts()
    {
        $sql = "SELECT * FROM security_alerts 
                WHERE status = 'active' 
                ORDER BY severity DESC, created_at DESC";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    /**
     * Generate security report
     */
    public function generateSecurityReport($startDate, $endDate)
    {
        $report = [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => $this->getSecuritySummaryForPeriod($startDate, $endDate),
            'incidents' => $this->getSecurityIncidents($startDate, $endDate),
            'trends' => $this->getSecurityTrends($startDate, $endDate),
            'recommendations' => $this->getSecurityRecommendations($startDate, $endDate)
        ];
        
        return $report;
    }
    
    /**
     * Private helper methods
     */
    private function setupAlertThresholds()
    {
        $this->alertThresholds = [
            'failed_login' => ['count' => 5, 'window' => 300], // 5 attempts in 5 minutes
            'sql_injection_attempt' => ['count' => 1, 'window' => 60], // 1 attempt in 1 minute
            'xss_attempt' => ['count' => 3, 'window' => 300], // 3 attempts in 5 minutes
            'suspicious_file_upload' => ['count' => 2, 'window' => 600], // 2 uploads in 10 minutes
            'csrf_attack' => ['count' => 1, 'window' => 60] // 1 attack in 1 minute
        ];
    }
    
    private function checkAlertThresholds($eventType, $severity)
    {
        if (!isset($this->alertThresholds[$eventType])) {
            return;
        }
        
        $threshold = $this->alertThresholds[$eventType];
        $since = date('Y-m-d H:i:s', time() - $threshold['window']);
        
        $sql = "SELECT COUNT(*) FROM security_events 
                WHERE event_type = ? AND created_at >= ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$eventType, $since]);
        $count = $stmt->fetchColumn();
        
        if ($count >= $threshold['count']) {
            $this->createSecurityAlert($eventType, $severity, $count, $threshold);
        }
    }
    
    private function createSecurityAlert($eventType, $severity, $count, $threshold)
    {
        $sql = "INSERT INTO security_alerts (
                    event_type, severity, event_count, threshold_count, 
                    time_window, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'active', NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $eventType,
            $severity,
            $count,
            $threshold['count'],
            $threshold['window']
        ]);
    }
    
    private function getRecentFailedAttempts($type, $value, $seconds)
    {
        $since = date('Y-m-d H:i:s', time() - $seconds);
        
        if ($type === 'email') {
            $sql = "SELECT COUNT(*) FROM security_events 
                    WHERE event_type = 'failed_login' 
                    AND JSON_EXTRACT(event_data, '$.email') = ? 
                    AND created_at >= ?";
        } else {
            $sql = "SELECT COUNT(*) FROM security_events 
                    WHERE event_type = 'failed_login' 
                    AND ip_address = ? 
                    AND created_at >= ?";
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$value, $since]);
        
        return $stmt->fetchColumn();
    }
    
    private function detectRapidRequests($userId)
    {
        $since = date('Y-m-d H:i:s', time() - 60); // Last minute
        
        $sql = "SELECT COUNT(*) FROM security_events 
                WHERE user_id = ? AND created_at >= ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $since]);
        
        return $stmt->fetchColumn() > 100; // More than 100 requests per minute
    }
    
    private function detectUnusualLocation($userId)
    {
        // This would typically use GeoIP data
        // For now, we'll check if the IP is different from recent logins
        $currentIp = $this->getClientIp();
        
        $sql = "SELECT DISTINCT ip_address FROM security_events 
                WHERE user_id = ? AND event_type = 'login_success' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        $recentIps = $stmt->fetchAll(\PDO::FETCH_COLUMN);
        
        return !in_array($currentIp, $recentIps);
    }
    
    private function detectPrivilegeEscalation($userId, $activityType)
    {
        $privilegedActions = [
            'user_role_changed',
            'permission_granted',
            'admin_action',
            'system_config_changed'
        ];
        
        return in_array($activityType, $privilegedActions);
    }
    
    private function detectDataExfiltration($userId, $activityType, $data)
    {
        if ($activityType === 'data_export' || $activityType === 'bulk_download') {
            $size = $data['size'] ?? 0;
            return $size > 100 * 1024 * 1024; // More than 100MB
        }
        
        return false;
    }
    
    private function getClientIp()
    {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                return trim($ips[0]);
            }
        }
        
        return 'unknown';
    }
    
    private function parseTimeframe($timeframe)
    {
        $map = [
            '1h' => 1,
            '6h' => 6,
            '12h' => 12,
            '24h' => 24,
            '7d' => 168,
            '30d' => 720
        ];
        
        return $map[$timeframe] ?? 24;
    }
    
    private function getSecuritySummary($since)
    {
        $sql = "SELECT 
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
                    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
                    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_events,
                    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_events,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT user_id) as affected_users
                FROM security_events 
                WHERE created_at >= ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    
    private function getEventsByType($since)
    {
        $sql = "SELECT event_type, COUNT(*) as count 
                FROM security_events 
                WHERE created_at >= ? 
                GROUP BY event_type 
                ORDER BY count DESC";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    private function getEventsBySeverity($since)
    {
        $sql = "SELECT severity, COUNT(*) as count 
                FROM security_events 
                WHERE created_at >= ? 
                GROUP BY severity 
                ORDER BY 
                    CASE severity 
                        WHEN 'critical' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        WHEN 'low' THEN 4 
                    END";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    private function getTopThreats($since)
    {
        $sql = "SELECT ip_address, COUNT(*) as threat_count,
                       GROUP_CONCAT(DISTINCT event_type) as event_types
                FROM security_events 
                WHERE created_at >= ? AND severity IN ('critical', 'high')
                GROUP BY ip_address 
                ORDER BY threat_count DESC 
                LIMIT 10";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    private function getGeographicData($since)
    {
        // This would typically use GeoIP data
        // For now, return IP addresses grouped by country (placeholder)
        $sql = "SELECT ip_address, COUNT(*) as count 
                FROM security_events 
                WHERE created_at >= ? 
                GROUP BY ip_address 
                ORDER BY count DESC 
                LIMIT 20";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    private function getSecurityTimeline($since)
    {
        $sql = "SELECT 
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
                    COUNT(*) as event_count,
                    COUNT(CASE WHEN severity IN ('critical', 'high') THEN 1 END) as high_severity_count
                FROM security_events 
                WHERE created_at >= ? 
                GROUP BY hour 
                ORDER BY hour";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$since]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function getSecuritySummaryForPeriod($startDate, $endDate)
    {
        $sql = "SELECT
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
                    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
                    COUNT(DISTINCT event_type) as unique_event_types,
                    COUNT(DISTINCT ip_address) as unique_ips
                FROM security_events
                WHERE created_at BETWEEN ? AND ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$startDate, $endDate]);

        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    private function getSecurityIncidents($startDate, $endDate)
    {
        $sql = "SELECT * FROM security_events
                WHERE created_at BETWEEN ? AND ?
                AND severity IN ('critical', 'high')
                ORDER BY created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$startDate, $endDate]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function getSecurityTrends($startDate, $endDate)
    {
        $sql = "SELECT
                    DATE(created_at) as date,
                    COUNT(*) as daily_events,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events
                FROM security_events
                WHERE created_at BETWEEN ? AND ?
                GROUP BY DATE(created_at)
                ORDER BY date";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$startDate, $endDate]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function getSecurityRecommendations($startDate, $endDate)
    {
        $recommendations = [];

        // Check for high number of failed logins
        $sql = "SELECT COUNT(*) FROM security_events
                WHERE event_type = 'failed_login'
                AND created_at BETWEEN ? AND ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        $failedLogins = $stmt->fetchColumn();

        if ($failedLogins > 100) {
            $recommendations[] = [
                'type' => 'authentication',
                'priority' => 'high',
                'message' => 'High number of failed login attempts detected. Consider implementing stronger rate limiting or CAPTCHA.'
            ];
        }

        // Check for SQL injection attempts
        $sql = "SELECT COUNT(*) FROM security_events
                WHERE event_type = 'sql_injection_attempt'
                AND created_at BETWEEN ? AND ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        $sqlInjections = $stmt->fetchColumn();

        if ($sqlInjections > 0) {
            $recommendations[] = [
                'type' => 'input_validation',
                'priority' => 'critical',
                'message' => 'SQL injection attempts detected. Review input validation and ensure all queries use prepared statements.'
            ];
        }

        return $recommendations;
    }
}
