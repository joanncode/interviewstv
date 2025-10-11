<?php

namespace App\Services;

/**
 * Advanced Rate Limiter with multiple algorithms and adaptive limits
 */
class AdvancedRateLimiter
{
    private $pdo;
    private $cache;
    private $config;

    public function __construct($pdo, $cache = null)
    {
        $this->pdo = $pdo;
        $this->cache = $cache ?: new CacheService();
        $this->config = [
            'algorithms' => [
                'fixed_window' => true,
                'sliding_window' => true,
                'token_bucket' => true,
                'leaky_bucket' => false
            ],
            'default_limits' => [
                'api_request' => ['requests' => 100, 'window' => 60],
                'login_attempt' => ['requests' => 5, 'window' => 900],
                'password_reset' => ['requests' => 3, 'window' => 3600],
                'file_upload' => ['requests' => 10, 'window' => 300],
                'search_query' => ['requests' => 50, 'window' => 60]
            ],
            'burst_protection' => true,
            'adaptive_limits' => true
        ];
    }

    /**
     * Check rate limit using specified algorithm
     */
    public function checkLimit($identifier, $action, $algorithm = 'sliding_window', $customLimits = null)
    {
        $limits = $customLimits ?: $this->config['default_limits'][$action] ?? ['requests' => 60, 'window' => 60];
        
        // Apply adaptive limits if enabled
        if ($this->config['adaptive_limits']) {
            $limits = $this->applyAdaptiveLimits($identifier, $action, $limits);
        }

        switch ($algorithm) {
            case 'fixed_window':
                return $this->checkFixedWindow($identifier, $action, $limits);
            case 'sliding_window':
                return $this->checkSlidingWindow($identifier, $action, $limits);
            case 'token_bucket':
                return $this->checkTokenBucket($identifier, $action, $limits);
            case 'leaky_bucket':
                return $this->checkLeakyBucket($identifier, $action, $limits);
            default:
                return $this->checkSlidingWindow($identifier, $action, $limits);
        }
    }

    /**
     * Fixed window rate limiting
     */
    private function checkFixedWindow($identifier, $action, $limits)
    {
        $windowStart = floor(time() / $limits['window']) * $limits['window'];
        $key = "rate_limit:fixed:{$action}:{$identifier}:{$windowStart}";
        
        $current = $this->cache->get($key, 0);
        
        if ($current >= $limits['requests']) {
            $this->logRateLimitExceeded($identifier, $action, 'fixed_window', $current, $limits);
            return false;
        }
        
        $this->cache->increment($key, 1, $limits['window']);
        $this->recordRequest($identifier, $action, 'fixed_window');
        
        return true;
    }

    /**
     * Sliding window rate limiting
     */
    private function checkSlidingWindow($identifier, $action, $limits)
    {
        $now = time();
        $windowStart = $now - $limits['window'];
        
        // Clean old entries
        $this->cleanOldEntries($identifier, $action, $windowStart);
        
        // Count requests in window
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM rate_limit_requests 
            WHERE identifier = ? AND action = ? AND created_at >= ?
        ");
        $stmt->execute([$identifier, $action, date('Y-m-d H:i:s', $windowStart)]);
        $count = $stmt->fetchColumn();
        
        if ($count >= $limits['requests']) {
            $this->logRateLimitExceeded($identifier, $action, 'sliding_window', $count, $limits);
            return false;
        }
        
        $this->recordRequest($identifier, $action, 'sliding_window');
        return true;
    }

    /**
     * Token bucket rate limiting
     */
    private function checkTokenBucket($identifier, $action, $limits)
    {
        $key = "rate_limit:bucket:{$action}:{$identifier}";
        $bucket = $this->cache->get($key, [
            'tokens' => $limits['requests'],
            'last_refill' => time()
        ]);
        
        $now = time();
        $timePassed = $now - $bucket['last_refill'];
        
        // Refill tokens
        $refillRate = $limits['requests'] / $limits['window'];
        $tokensToAdd = floor($timePassed * $refillRate);
        $bucket['tokens'] = min($limits['requests'], $bucket['tokens'] + $tokensToAdd);
        $bucket['last_refill'] = $now;
        
        if ($bucket['tokens'] < 1) {
            $this->logRateLimitExceeded($identifier, $action, 'token_bucket', 0, $limits);
            return false;
        }
        
        $bucket['tokens']--;
        $this->cache->set($key, $bucket, $limits['window'] * 2);
        $this->recordRequest($identifier, $action, 'token_bucket');
        
        return true;
    }

    /**
     * Leaky bucket rate limiting
     */
    private function checkLeakyBucket($identifier, $action, $limits)
    {
        $key = "rate_limit:leaky:{$action}:{$identifier}";
        $bucket = $this->cache->get($key, [
            'volume' => 0,
            'last_leak' => time()
        ]);
        
        $now = time();
        $timePassed = $now - $bucket['last_leak'];
        
        // Leak tokens
        $leakRate = $limits['requests'] / $limits['window'];
        $tokensToLeak = floor($timePassed * $leakRate);
        $bucket['volume'] = max(0, $bucket['volume'] - $tokensToLeak);
        $bucket['last_leak'] = $now;
        
        if ($bucket['volume'] >= $limits['requests']) {
            $this->logRateLimitExceeded($identifier, $action, 'leaky_bucket', $bucket['volume'], $limits);
            return false;
        }
        
        $bucket['volume']++;
        $this->cache->set($key, $bucket, $limits['window'] * 2);
        $this->recordRequest($identifier, $action, 'leaky_bucket');
        
        return true;
    }

    /**
     * Apply adaptive limits based on user behavior
     */
    private function applyAdaptiveLimits($identifier, $action, $baseLimits)
    {
        // Get user's recent behavior
        $recentViolations = $this->getRecentViolations($identifier, $action);
        $userReputation = $this->getUserReputation($identifier);
        
        $multiplier = 1.0;
        
        // Reduce limits for users with recent violations
        if ($recentViolations > 0) {
            $multiplier *= (1 - ($recentViolations * 0.2)); // Reduce by 20% per violation
        }
        
        // Adjust based on user reputation
        if ($userReputation < 0.5) {
            $multiplier *= 0.5; // Halve limits for low reputation users
        } elseif ($userReputation > 0.8) {
            $multiplier *= 1.5; // Increase limits for high reputation users
        }
        
        // Apply burst protection
        if ($this->config['burst_protection'] && $this->detectBurstPattern($identifier, $action)) {
            $multiplier *= 0.3; // Severely limit burst patterns
        }
        
        return [
            'requests' => max(1, floor($baseLimits['requests'] * $multiplier)),
            'window' => $baseLimits['window']
        ];
    }

    /**
     * Get recent rate limit violations
     */
    private function getRecentViolations($identifier, $action)
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM rate_limit_violations 
            WHERE identifier = ? AND action = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute([$identifier, $action]);
        return $stmt->fetchColumn();
    }

    /**
     * Get user reputation score (0-1)
     */
    private function getUserReputation($identifier)
    {
        // Simple reputation based on violation history
        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN is_violation = 1 THEN 1 ELSE 0 END) as violations
            FROM rate_limit_requests 
            WHERE identifier = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
        $stmt->execute([$identifier]);
        $stats = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($stats['total_requests'] == 0) {
            return 0.5; // Neutral for new users
        }
        
        $violationRate = $stats['violations'] / $stats['total_requests'];
        return max(0, 1 - $violationRate);
    }

    /**
     * Detect burst patterns
     */
    private function detectBurstPattern($identifier, $action)
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM rate_limit_requests 
            WHERE identifier = ? AND action = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
        ");
        $stmt->execute([$identifier, $action]);
        $recentRequests = $stmt->fetchColumn();
        
        // Consider it a burst if more than 10 requests in 10 seconds
        return $recentRequests > 10;
    }

    /**
     * Record a request
     */
    private function recordRequest($identifier, $action, $algorithm)
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO rate_limit_requests (identifier, action, algorithm, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $identifier,
                $action,
                $algorithm,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            error_log("Failed to record rate limit request: " . $e->getMessage());
        }
    }

    /**
     * Log rate limit exceeded event
     */
    private function logRateLimitExceeded($identifier, $action, $algorithm, $currentCount, $limits)
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO rate_limit_violations (identifier, action, algorithm, current_count, limit_count, window_seconds, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $identifier,
                $action,
                $algorithm,
                $currentCount,
                $limits['requests'],
                $limits['window'],
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (\Exception $e) {
            error_log("Failed to log rate limit violation: " . $e->getMessage());
        }
    }

    /**
     * Clean old entries
     */
    private function cleanOldEntries($identifier, $action, $windowStart)
    {
        try {
            $stmt = $this->pdo->prepare("
                DELETE FROM rate_limit_requests 
                WHERE identifier = ? AND action = ? AND created_at < ?
            ");
            $stmt->execute([$identifier, $action, date('Y-m-d H:i:s', $windowStart)]);
        } catch (\Exception $e) {
            // Ignore cleanup errors
        }
    }

    /**
     * Get current rate limit status
     */
    public function getStatus($identifier, $action)
    {
        $limits = $this->config['default_limits'][$action] ?? ['requests' => 60, 'window' => 60];
        $windowStart = time() - $limits['window'];
        
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM rate_limit_requests 
            WHERE identifier = ? AND action = ? AND created_at >= ?
        ");
        $stmt->execute([$identifier, $action, date('Y-m-d H:i:s', $windowStart)]);
        $used = $stmt->fetchColumn();
        
        return [
            'limit' => $limits['requests'],
            'used' => $used,
            'remaining' => max(0, $limits['requests'] - $used),
            'reset_time' => time() + $limits['window']
        ];
    }
}
