<?php

namespace App\Services;

class RateLimitService
{
    private $cache;
    private $defaultLimits;
    private $customLimits;
    
    public function __construct($cache = null)
    {
        $this->cache = $cache ?: new CacheService();
        $this->setupDefaultLimits();
        $this->customLimits = [];
    }
    
    /**
     * Check if request is within rate limit
     */
    public function isAllowed($identifier, $action = 'default', $customLimit = null)
    {
        $limit = $customLimit ?: $this->getLimit($action);
        $key = $this->buildKey($identifier, $action);
        
        $current = $this->getCurrentCount($key);
        
        if ($current >= $limit['requests']) {
            $this->logRateLimitExceeded($identifier, $action, $current, $limit);
            return false;
        }
        
        $this->incrementCount($key, $limit['window']);
        return true;
    }
    
    /**
     * Get current usage for identifier
     */
    public function getCurrentUsage($identifier, $action = 'default')
    {
        $limit = $this->getLimit($action);
        $key = $this->buildKey($identifier, $action);
        $current = $this->getCurrentCount($key);
        
        return [
            'current' => $current,
            'limit' => $limit['requests'],
            'window' => $limit['window'],
            'remaining' => max(0, $limit['requests'] - $current),
            'reset_time' => $this->getResetTime($key, $limit['window'])
        ];
    }
    
    /**
     * Set custom rate limit for specific action
     */
    public function setCustomLimit($action, $requests, $window)
    {
        $this->customLimits[$action] = [
            'requests' => $requests,
            'window' => $window
        ];
    }
    
    /**
     * Apply rate limit with different strategies
     */
    public function applyRateLimit($identifier, $action = 'default', $strategy = 'sliding_window')
    {
        switch ($strategy) {
            case 'fixed_window':
                return $this->fixedWindowRateLimit($identifier, $action);
            case 'sliding_window':
                return $this->slidingWindowRateLimit($identifier, $action);
            case 'token_bucket':
                return $this->tokenBucketRateLimit($identifier, $action);
            default:
                return $this->slidingWindowRateLimit($identifier, $action);
        }
    }
    
    /**
     * Fixed window rate limiting
     */
    private function fixedWindowRateLimit($identifier, $action)
    {
        $limit = $this->getLimit($action);
        $window = floor(time() / $limit['window']);
        $key = $this->buildKey($identifier, $action) . ":{$window}";
        
        $current = $this->cache->get($key, 0);
        
        if ($current >= $limit['requests']) {
            return [
                'allowed' => false,
                'current' => $current,
                'limit' => $limit['requests'],
                'reset_time' => ($window + 1) * $limit['window']
            ];
        }
        
        $this->cache->set($key, $current + 1, $limit['window']);
        
        return [
            'allowed' => true,
            'current' => $current + 1,
            'limit' => $limit['requests'],
            'remaining' => $limit['requests'] - ($current + 1)
        ];
    }
    
    /**
     * Sliding window rate limiting
     */
    private function slidingWindowRateLimit($identifier, $action)
    {
        $limit = $this->getLimit($action);
        $key = $this->buildKey($identifier, $action);
        $now = time();
        $window_start = $now - $limit['window'];
        
        // Get current requests in the sliding window
        $requests = $this->cache->get($key, []);
        
        // Remove old requests outside the window
        $requests = array_filter($requests, function($timestamp) use ($window_start) {
            return $timestamp > $window_start;
        });
        
        if (count($requests) >= $limit['requests']) {
            return [
                'allowed' => false,
                'current' => count($requests),
                'limit' => $limit['requests'],
                'reset_time' => min($requests) + $limit['window']
            ];
        }
        
        // Add current request
        $requests[] = $now;
        $this->cache->set($key, $requests, $limit['window']);
        
        return [
            'allowed' => true,
            'current' => count($requests),
            'limit' => $limit['requests'],
            'remaining' => $limit['requests'] - count($requests)
        ];
    }
    
    /**
     * Token bucket rate limiting
     */
    private function tokenBucketRateLimit($identifier, $action)
    {
        $limit = $this->getLimit($action);
        $key = $this->buildKey($identifier, $action);
        $now = time();
        
        $bucket = $this->cache->get($key, [
            'tokens' => $limit['requests'],
            'last_refill' => $now
        ]);
        
        // Calculate tokens to add based on time elapsed
        $time_elapsed = $now - $bucket['last_refill'];
        $tokens_to_add = floor($time_elapsed * ($limit['requests'] / $limit['window']));
        
        $bucket['tokens'] = min($limit['requests'], $bucket['tokens'] + $tokens_to_add);
        $bucket['last_refill'] = $now;
        
        if ($bucket['tokens'] < 1) {
            $this->cache->set($key, $bucket, $limit['window']);
            
            return [
                'allowed' => false,
                'current' => $limit['requests'] - $bucket['tokens'],
                'limit' => $limit['requests'],
                'reset_time' => $now + ($limit['window'] / $limit['requests'])
            ];
        }
        
        $bucket['tokens']--;
        $this->cache->set($key, $bucket, $limit['window']);
        
        return [
            'allowed' => true,
            'current' => $limit['requests'] - $bucket['tokens'],
            'limit' => $limit['requests'],
            'remaining' => $bucket['tokens']
        ];
    }
    
    /**
     * Adaptive rate limiting based on system load
     */
    public function adaptiveRateLimit($identifier, $action, $systemLoad = null)
    {
        $baseLimit = $this->getLimit($action);
        $systemLoad = $systemLoad ?: $this->getSystemLoad();
        
        // Adjust limits based on system load
        $adjustmentFactor = 1.0;
        
        if ($systemLoad > 0.8) {
            $adjustmentFactor = 0.5; // Reduce limits by 50% under high load
        } elseif ($systemLoad > 0.6) {
            $adjustmentFactor = 0.7; // Reduce limits by 30% under medium load
        } elseif ($systemLoad < 0.3) {
            $adjustmentFactor = 1.5; // Increase limits by 50% under low load
        }
        
        $adaptedLimit = [
            'requests' => floor($baseLimit['requests'] * $adjustmentFactor),
            'window' => $baseLimit['window']
        ];
        
        return $this->applyRateLimit($identifier, $action . '_adaptive', 'sliding_window');
    }
    
    /**
     * Burst rate limiting (allow short bursts)
     */
    public function burstRateLimit($identifier, $action, $burstSize = null)
    {
        $limit = $this->getLimit($action);
        $burstSize = $burstSize ?: $limit['requests'] * 2;
        
        // Check burst limit first
        $burstKey = $this->buildKey($identifier, $action . '_burst');
        $burstCount = $this->getCurrentCount($burstKey);
        
        if ($burstCount >= $burstSize) {
            return [
                'allowed' => false,
                'reason' => 'burst_limit_exceeded',
                'burst_count' => $burstCount,
                'burst_limit' => $burstSize
            ];
        }
        
        // Check regular rate limit
        $regularResult = $this->slidingWindowRateLimit($identifier, $action);
        
        if ($regularResult['allowed']) {
            // Increment burst counter
            $this->incrementCount($burstKey, 60); // 1 minute burst window
        }
        
        return $regularResult;
    }
    
    /**
     * Get rate limit statistics
     */
    public function getStatistics($timeframe = '1h')
    {
        $hours = $this->parseTimeframe($timeframe);
        $stats = [
            'total_requests' => 0,
            'blocked_requests' => 0,
            'top_identifiers' => [],
            'top_actions' => [],
            'block_rate' => 0
        ];
        
        // This would typically query a database or log files
        // For now, return placeholder data
        return $stats;
    }
    
    /**
     * Clear rate limit for identifier
     */
    public function clearRateLimit($identifier, $action = null)
    {
        if ($action) {
            $key = $this->buildKey($identifier, $action);
            $this->cache->delete($key);
        } else {
            // Clear all rate limits for this identifier
            $pattern = "rate_limit:{$identifier}:*";
            $this->cache->flush($pattern);
        }
    }
    
    /**
     * Whitelist identifier (bypass rate limiting)
     */
    public function whitelist($identifier, $duration = 3600)
    {
        $key = "rate_limit_whitelist:{$identifier}";
        $this->cache->set($key, true, $duration);
    }
    
    /**
     * Check if identifier is whitelisted
     */
    public function isWhitelisted($identifier)
    {
        $key = "rate_limit_whitelist:{$identifier}";
        return $this->cache->get($key, false);
    }
    
    /**
     * Blacklist identifier (block all requests)
     */
    public function blacklist($identifier, $duration = 3600)
    {
        $key = "rate_limit_blacklist:{$identifier}";
        $this->cache->set($key, true, $duration);
    }
    
    /**
     * Check if identifier is blacklisted
     */
    public function isBlacklisted($identifier)
    {
        $key = "rate_limit_blacklist:{$identifier}";
        return $this->cache->get($key, false);
    }
    
    /**
     * Private helper methods
     */
    private function setupDefaultLimits()
    {
        $this->defaultLimits = [
            'default' => ['requests' => 60, 'window' => 60], // 60 requests per minute
            'login' => ['requests' => 5, 'window' => 300], // 5 login attempts per 5 minutes
            'api' => ['requests' => 1000, 'window' => 3600], // 1000 API calls per hour
            'upload' => ['requests' => 10, 'window' => 600], // 10 uploads per 10 minutes
            'search' => ['requests' => 100, 'window' => 300], // 100 searches per 5 minutes
            'password_reset' => ['requests' => 3, 'window' => 3600], // 3 password resets per hour
            'registration' => ['requests' => 5, 'window' => 3600] // 5 registrations per hour
        ];
    }
    
    private function getLimit($action)
    {
        return $this->customLimits[$action] ?? $this->defaultLimits[$action] ?? $this->defaultLimits['default'];
    }
    
    private function buildKey($identifier, $action)
    {
        return "rate_limit:{$identifier}:{$action}";
    }
    
    private function getCurrentCount($key)
    {
        return $this->cache->get($key, 0);
    }
    
    private function incrementCount($key, $ttl)
    {
        $current = $this->getCurrentCount($key);
        $this->cache->set($key, $current + 1, $ttl);
    }
    
    private function getResetTime($key, $window)
    {
        // This is a simplified implementation
        // In practice, you'd track when the window started
        return time() + $window;
    }
    
    private function logRateLimitExceeded($identifier, $action, $current, $limit)
    {
        error_log("Rate limit exceeded for {$identifier} on action {$action}: {$current}/{$limit['requests']}");
    }
    
    private function getSystemLoad()
    {
        // Get system load average (Unix/Linux systems)
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            return $load[0]; // 1-minute load average
        }
        
        // Fallback: estimate based on CPU usage or other metrics
        return 0.5; // Default moderate load
    }
    
    private function parseTimeframe($timeframe)
    {
        $map = [
            '1h' => 1,
            '6h' => 6,
            '12h' => 12,
            '24h' => 24,
            '7d' => 168
        ];
        
        return $map[$timeframe] ?? 1;
    }
}
