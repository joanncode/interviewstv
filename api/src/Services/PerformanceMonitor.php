<?php

namespace App\Services;

class PerformanceMonitor
{
    private $metrics;
    private $startTime;
    private $memoryStart;
    private $thresholds;
    private $cache;
    
    public function __construct($cache = null)
    {
        $this->metrics = [];
        $this->startTime = microtime(true);
        $this->memoryStart = memory_get_usage(true);
        $this->cache = $cache ?: new CacheService();
        
        $this->thresholds = [
            'response_time' => 2.0, // seconds
            'memory_usage' => 128 * 1024 * 1024, // 128MB
            'database_queries' => 50,
            'cache_hit_rate' => 80 // percentage
        ];
    }
    
    /**
     * Start timing a specific operation
     */
    public function startTimer($name)
    {
        $this->metrics[$name] = [
            'start_time' => microtime(true),
            'start_memory' => memory_get_usage(true)
        ];
    }
    
    /**
     * End timing a specific operation
     */
    public function endTimer($name)
    {
        if (!isset($this->metrics[$name])) {
            return false;
        }
        
        $this->metrics[$name]['end_time'] = microtime(true);
        $this->metrics[$name]['end_memory'] = memory_get_usage(true);
        $this->metrics[$name]['duration'] = $this->metrics[$name]['end_time'] - $this->metrics[$name]['start_time'];
        $this->metrics[$name]['memory_used'] = $this->metrics[$name]['end_memory'] - $this->metrics[$name]['start_memory'];
        
        return $this->metrics[$name];
    }
    
    /**
     * Record a custom metric
     */
    public function recordMetric($name, $value, $unit = null)
    {
        $this->metrics[$name] = [
            'value' => $value,
            'unit' => $unit,
            'timestamp' => microtime(true)
        ];
    }
    
    /**
     * Increment a counter metric
     */
    public function incrementCounter($name, $value = 1)
    {
        if (!isset($this->metrics[$name])) {
            $this->metrics[$name] = ['count' => 0];
        }
        
        $this->metrics[$name]['count'] += $value;
        $this->metrics[$name]['last_updated'] = microtime(true);
    }
    
    /**
     * Record database query metrics
     */
    public function recordDatabaseQuery($sql, $executionTime, $cached = false)
    {
        if (!isset($this->metrics['database'])) {
            $this->metrics['database'] = [
                'queries' => [],
                'total_time' => 0,
                'query_count' => 0,
                'cached_count' => 0
            ];
        }
        
        $this->metrics['database']['queries'][] = [
            'sql' => $sql,
            'execution_time' => $executionTime,
            'cached' => $cached,
            'timestamp' => microtime(true)
        ];
        
        $this->metrics['database']['total_time'] += $executionTime;
        $this->metrics['database']['query_count']++;
        
        if ($cached) {
            $this->metrics['database']['cached_count']++;
        }
    }
    
    /**
     * Record HTTP request metrics
     */
    public function recordHttpRequest($url, $method, $responseTime, $statusCode)
    {
        if (!isset($this->metrics['http_requests'])) {
            $this->metrics['http_requests'] = [];
        }
        
        $this->metrics['http_requests'][] = [
            'url' => $url,
            'method' => $method,
            'response_time' => $responseTime,
            'status_code' => $statusCode,
            'timestamp' => microtime(true)
        ];
    }
    
    /**
     * Record cache operation metrics
     */
    public function recordCacheOperation($operation, $key, $hit = null, $executionTime = null)
    {
        if (!isset($this->metrics['cache'])) {
            $this->metrics['cache'] = [
                'operations' => [],
                'hits' => 0,
                'misses' => 0,
                'total_time' => 0
            ];
        }
        
        $this->metrics['cache']['operations'][] = [
            'operation' => $operation,
            'key' => $key,
            'hit' => $hit,
            'execution_time' => $executionTime,
            'timestamp' => microtime(true)
        ];
        
        if ($hit === true) {
            $this->metrics['cache']['hits']++;
        } elseif ($hit === false) {
            $this->metrics['cache']['misses']++;
        }
        
        if ($executionTime) {
            $this->metrics['cache']['total_time'] += $executionTime;
        }
    }
    
    /**
     * Get current performance metrics
     */
    public function getMetrics()
    {
        $currentTime = microtime(true);
        $currentMemory = memory_get_usage(true);
        
        $summary = [
            'request_time' => $currentTime - $this->startTime,
            'memory_usage' => $currentMemory,
            'memory_peak' => memory_get_peak_usage(true),
            'memory_delta' => $currentMemory - $this->memoryStart,
            'timestamp' => $currentTime,
            'metrics' => $this->metrics
        ];
        
        // Add computed metrics
        $summary['computed'] = $this->computeMetrics();
        
        // Check thresholds
        $summary['alerts'] = $this->checkThresholds($summary);
        
        return $summary;
    }
    
    /**
     * Get performance summary
     */
    public function getSummary()
    {
        $metrics = $this->getMetrics();
        
        return [
            'response_time' => round($metrics['request_time'], 3),
            'memory_usage' => $this->formatBytes($metrics['memory_usage']),
            'memory_peak' => $this->formatBytes($metrics['memory_peak']),
            'database_queries' => $metrics['computed']['database_query_count'] ?? 0,
            'database_time' => round($metrics['computed']['database_total_time'] ?? 0, 3),
            'cache_hit_rate' => round($metrics['computed']['cache_hit_rate'] ?? 0, 1),
            'alerts' => $metrics['alerts']
        ];
    }
    
    /**
     * Store metrics for historical analysis
     */
    public function storeMetrics($endpoint = null)
    {
        $metrics = $this->getMetrics();
        $timestamp = date('Y-m-d H:i:s');
        
        // Store in cache for recent metrics
        $cacheKey = 'performance_metrics_' . date('Y-m-d-H-i-s') . '_' . uniqid();
        $this->cache->set($cacheKey, $metrics, 3600); // Store for 1 hour
        
        // Store aggregated metrics
        $this->storeAggregatedMetrics($metrics, $endpoint);
        
        return $cacheKey;
    }
    
    /**
     * Get historical performance data
     */
    public function getHistoricalData($hours = 24)
    {
        $data = [];
        $endTime = time();
        $startTime = $endTime - ($hours * 3600);
        
        // Get aggregated data from cache
        for ($hour = $startTime; $hour <= $endTime; $hour += 3600) {
            $hourKey = 'perf_hourly_' . date('Y-m-d-H', $hour);
            $hourData = $this->cache->get($hourKey);
            
            if ($hourData) {
                $data[] = $hourData;
            }
        }
        
        return $data;
    }
    
    /**
     * Generate performance report
     */
    public function generateReport($period = '24h')
    {
        $hours = $period === '24h' ? 24 : ($period === '7d' ? 168 : 24);
        $data = $this->getHistoricalData($hours);
        
        if (empty($data)) {
            return ['error' => 'No data available for the specified period'];
        }
        
        $report = [
            'period' => $period,
            'data_points' => count($data),
            'summary' => [
                'avg_response_time' => 0,
                'max_response_time' => 0,
                'avg_memory_usage' => 0,
                'max_memory_usage' => 0,
                'total_requests' => 0,
                'avg_database_queries' => 0,
                'avg_cache_hit_rate' => 0
            ],
            'trends' => [],
            'alerts' => []
        ];
        
        // Calculate summary statistics
        $responseTimes = array_column($data, 'avg_response_time');
        $memoryUsages = array_column($data, 'avg_memory_usage');
        $requestCounts = array_column($data, 'request_count');
        $dbQueries = array_column($data, 'avg_database_queries');
        $cacheHitRates = array_column($data, 'avg_cache_hit_rate');
        
        $report['summary']['avg_response_time'] = array_sum($responseTimes) / count($responseTimes);
        $report['summary']['max_response_time'] = max($responseTimes);
        $report['summary']['avg_memory_usage'] = array_sum($memoryUsages) / count($memoryUsages);
        $report['summary']['max_memory_usage'] = max($memoryUsages);
        $report['summary']['total_requests'] = array_sum($requestCounts);
        $report['summary']['avg_database_queries'] = array_sum($dbQueries) / count($dbQueries);
        $report['summary']['avg_cache_hit_rate'] = array_sum($cacheHitRates) / count($cacheHitRates);
        
        // Analyze trends
        $report['trends'] = $this->analyzeTrends($data);
        
        // Collect alerts
        foreach ($data as $dataPoint) {
            if (!empty($dataPoint['alerts'])) {
                $report['alerts'] = array_merge($report['alerts'], $dataPoint['alerts']);
            }
        }
        
        return $report;
    }
    
    /**
     * Private helper methods
     */
    private function computeMetrics()
    {
        $computed = [];
        
        // Database metrics
        if (isset($this->metrics['database'])) {
            $db = $this->metrics['database'];
            $computed['database_query_count'] = $db['query_count'];
            $computed['database_total_time'] = $db['total_time'];
            $computed['database_avg_time'] = $db['query_count'] > 0 ? $db['total_time'] / $db['query_count'] : 0;
            $computed['database_cache_hit_rate'] = $db['query_count'] > 0 ? ($db['cached_count'] / $db['query_count']) * 100 : 0;
        }
        
        // Cache metrics
        if (isset($this->metrics['cache'])) {
            $cache = $this->metrics['cache'];
            $total = $cache['hits'] + $cache['misses'];
            $computed['cache_hit_rate'] = $total > 0 ? ($cache['hits'] / $total) * 100 : 0;
            $computed['cache_operations'] = count($cache['operations']);
        }
        
        return $computed;
    }
    
    private function checkThresholds($metrics)
    {
        $alerts = [];
        
        // Check response time
        if ($metrics['request_time'] > $this->thresholds['response_time']) {
            $alerts[] = [
                'type' => 'slow_response',
                'message' => "Response time ({$metrics['request_time']}s) exceeds threshold ({$this->thresholds['response_time']}s)",
                'severity' => 'warning'
            ];
        }
        
        // Check memory usage
        if ($metrics['memory_usage'] > $this->thresholds['memory_usage']) {
            $alerts[] = [
                'type' => 'high_memory',
                'message' => "Memory usage ({$this->formatBytes($metrics['memory_usage'])}) exceeds threshold ({$this->formatBytes($this->thresholds['memory_usage'])})",
                'severity' => 'warning'
            ];
        }
        
        // Check database queries
        $queryCount = $metrics['computed']['database_query_count'] ?? 0;
        if ($queryCount > $this->thresholds['database_queries']) {
            $alerts[] = [
                'type' => 'too_many_queries',
                'message' => "Database queries ({$queryCount}) exceed threshold ({$this->thresholds['database_queries']})",
                'severity' => 'warning'
            ];
        }
        
        // Check cache hit rate
        $hitRate = $metrics['computed']['cache_hit_rate'] ?? 100;
        if ($hitRate < $this->thresholds['cache_hit_rate']) {
            $alerts[] = [
                'type' => 'low_cache_hit_rate',
                'message' => "Cache hit rate ({$hitRate}%) below threshold ({$this->thresholds['cache_hit_rate']}%)",
                'severity' => 'info'
            ];
        }
        
        return $alerts;
    }
    
    private function storeAggregatedMetrics($metrics, $endpoint)
    {
        $hour = date('Y-m-d-H');
        $hourKey = 'perf_hourly_' . $hour;
        
        $hourlyData = $this->cache->get($hourKey, [
            'hour' => $hour,
            'request_count' => 0,
            'total_response_time' => 0,
            'total_memory_usage' => 0,
            'total_database_queries' => 0,
            'total_cache_operations' => 0,
            'cache_hits' => 0,
            'cache_misses' => 0,
            'alerts' => []
        ]);
        
        // Update aggregated data
        $hourlyData['request_count']++;
        $hourlyData['total_response_time'] += $metrics['request_time'];
        $hourlyData['total_memory_usage'] += $metrics['memory_usage'];
        $hourlyData['total_database_queries'] += $metrics['computed']['database_query_count'] ?? 0;
        
        if (isset($metrics['computed']['cache_operations'])) {
            $hourlyData['total_cache_operations'] += $metrics['computed']['cache_operations'];
        }
        
        if (isset($this->metrics['cache'])) {
            $hourlyData['cache_hits'] += $this->metrics['cache']['hits'];
            $hourlyData['cache_misses'] += $this->metrics['cache']['misses'];
        }
        
        // Calculate averages
        $hourlyData['avg_response_time'] = $hourlyData['total_response_time'] / $hourlyData['request_count'];
        $hourlyData['avg_memory_usage'] = $hourlyData['total_memory_usage'] / $hourlyData['request_count'];
        $hourlyData['avg_database_queries'] = $hourlyData['total_database_queries'] / $hourlyData['request_count'];
        
        $totalCacheOps = $hourlyData['cache_hits'] + $hourlyData['cache_misses'];
        $hourlyData['avg_cache_hit_rate'] = $totalCacheOps > 0 ? ($hourlyData['cache_hits'] / $totalCacheOps) * 100 : 0;
        
        // Store alerts
        if (!empty($metrics['alerts'])) {
            $hourlyData['alerts'] = array_merge($hourlyData['alerts'], $metrics['alerts']);
        }
        
        $this->cache->set($hourKey, $hourlyData, 86400); // Store for 24 hours
    }
    
    private function analyzeTrends($data)
    {
        if (count($data) < 2) {
            return ['insufficient_data' => true];
        }
        
        $trends = [];
        
        // Analyze response time trend
        $responseTimes = array_column($data, 'avg_response_time');
        $trends['response_time'] = $this->calculateTrend($responseTimes);
        
        // Analyze memory usage trend
        $memoryUsages = array_column($data, 'avg_memory_usage');
        $trends['memory_usage'] = $this->calculateTrend($memoryUsages);
        
        return $trends;
    }
    
    private function calculateTrend($values)
    {
        $n = count($values);
        if ($n < 2) return 'stable';
        
        $first = array_slice($values, 0, intval($n / 3));
        $last = array_slice($values, -intval($n / 3));
        
        $firstAvg = array_sum($first) / count($first);
        $lastAvg = array_sum($last) / count($last);
        
        $change = (($lastAvg - $firstAvg) / $firstAvg) * 100;
        
        if ($change > 10) return 'increasing';
        if ($change < -10) return 'decreasing';
        return 'stable';
    }
    
    private function formatBytes($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}
