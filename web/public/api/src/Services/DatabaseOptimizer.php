<?php

namespace App\Services;

class DatabaseOptimizer
{
    private $pdo;
    private $cache;
    private $queryLog;
    private $slowQueryThreshold;
    
    public function __construct($pdo, $cache = null, $slowQueryThreshold = 1.0)
    {
        $this->pdo = $pdo;
        $this->cache = $cache ?: new CacheService();
        $this->queryLog = [];
        $this->slowQueryThreshold = $slowQueryThreshold; // seconds
    }
    
    /**
     * Execute optimized query with caching
     */
    public function query($sql, $params = [], $cacheKey = null, $cacheTtl = 3600)
    {
        $startTime = microtime(true);
        
        // Check cache first if cache key provided
        if ($cacheKey && $this->isSelectQuery($sql)) {
            $cached = $this->cache->get($cacheKey);
            if ($cached !== null) {
                $this->logQuery($sql, $params, microtime(true) - $startTime, true);
                return $cached;
            }
        }
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $result = $this->isSelectQuery($sql) ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : $stmt->rowCount();
            
            $executionTime = microtime(true) - $startTime;
            $this->logQuery($sql, $params, $executionTime, false);
            
            // Cache SELECT results if cache key provided
            if ($cacheKey && $this->isSelectQuery($sql) && $result) {
                $this->cache->set($cacheKey, $result, $cacheTtl);
            }
            
            return $result;
            
        } catch (\PDOException $e) {
            $this->logQuery($sql, $params, microtime(true) - $startTime, false, $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Execute batch insert with optimization
     */
    public function batchInsert($table, $data, $batchSize = 1000)
    {
        if (empty($data)) {
            return 0;
        }
        
        $totalInserted = 0;
        $chunks = array_chunk($data, $batchSize);
        
        foreach ($chunks as $chunk) {
            $totalInserted += $this->insertChunk($table, $chunk);
        }
        
        return $totalInserted;
    }
    
    /**
     * Execute optimized pagination query
     */
    public function paginate($sql, $params = [], $page = 1, $limit = 20, $cacheKey = null)
    {
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countSql = $this->buildCountQuery($sql);
        $totalCacheKey = $cacheKey ? $cacheKey . '_count' : null;
        $total = $this->query($countSql, $params, $totalCacheKey, 300); // Cache count for 5 minutes
        $totalCount = is_array($total) ? $total[0]['count'] : $total;
        
        // Get paginated results
        $paginatedSql = $sql . " LIMIT {$limit} OFFSET {$offset}";
        $pageCacheKey = $cacheKey ? $cacheKey . "_page_{$page}_limit_{$limit}" : null;
        $results = $this->query($paginatedSql, $params, $pageCacheKey, 600); // Cache pages for 10 minutes
        
        return [
            'data' => $results,
            'total' => $totalCount,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($totalCount / $limit),
            'has_more' => $page * $limit < $totalCount
        ];
    }
    
    /**
     * Analyze query performance
     */
    public function analyzeQuery($sql, $params = [])
    {
        // Get query execution plan
        $explainSql = "EXPLAIN " . $sql;
        $plan = $this->query($explainSql, $params);
        
        // Analyze the plan
        $analysis = [
            'plan' => $plan,
            'issues' => [],
            'suggestions' => []
        ];
        
        foreach ($plan as $row) {
            // Check for table scans
            if ($row['type'] === 'ALL') {
                $analysis['issues'][] = "Full table scan on table: {$row['table']}";
                $analysis['suggestions'][] = "Consider adding an index on the columns used in WHERE clause for table: {$row['table']}";
            }
            
            // Check for filesort
            if (isset($row['Extra']) && strpos($row['Extra'], 'Using filesort') !== false) {
                $analysis['issues'][] = "Filesort operation detected";
                $analysis['suggestions'][] = "Consider adding an index to avoid filesort";
            }
            
            // Check for temporary table
            if (isset($row['Extra']) && strpos($row['Extra'], 'Using temporary') !== false) {
                $analysis['issues'][] = "Temporary table creation detected";
                $analysis['suggestions'][] = "Consider optimizing the query to avoid temporary table creation";
            }
        }
        
        return $analysis;
    }
    
    /**
     * Get slow query log
     */
    public function getSlowQueries($limit = 50)
    {
        $slowQueries = array_filter($this->queryLog, function($query) {
            return $query['execution_time'] > $this->slowQueryThreshold;
        });
        
        // Sort by execution time (slowest first)
        usort($slowQueries, function($a, $b) {
            return $b['execution_time'] <=> $a['execution_time'];
        });
        
        return array_slice($slowQueries, 0, $limit);
    }
    
    /**
     * Get query statistics
     */
    public function getQueryStats()
    {
        $totalQueries = count($this->queryLog);
        $cachedQueries = count(array_filter($this->queryLog, function($q) { return $q['cached']; }));
        $slowQueries = count(array_filter($this->queryLog, function($q) { return $q['execution_time'] > $this->slowQueryThreshold; }));
        
        $totalTime = array_sum(array_column($this->queryLog, 'execution_time'));
        $avgTime = $totalQueries > 0 ? $totalTime / $totalQueries : 0;
        
        return [
            'total_queries' => $totalQueries,
            'cached_queries' => $cachedQueries,
            'slow_queries' => $slowQueries,
            'cache_hit_rate' => $totalQueries > 0 ? ($cachedQueries / $totalQueries) * 100 : 0,
            'total_execution_time' => $totalTime,
            'average_execution_time' => $avgTime,
            'slow_query_threshold' => $this->slowQueryThreshold
        ];
    }
    
    /**
     * Optimize database tables
     */
    public function optimizeTables($tables = [])
    {
        if (empty($tables)) {
            // Get all tables if none specified
            $result = $this->pdo->query("SHOW TABLES");
            $tables = $result->fetchAll(\PDO::FETCH_COLUMN);
        }
        
        $results = [];
        
        foreach ($tables as $table) {
            try {
                $this->pdo->exec("OPTIMIZE TABLE `{$table}`");
                $results[$table] = 'optimized';
            } catch (\PDOException $e) {
                $results[$table] = 'error: ' . $e->getMessage();
            }
        }
        
        return $results;
    }
    
    /**
     * Analyze table structure and suggest optimizations
     */
    public function analyzeTable($table)
    {
        $analysis = [
            'table' => $table,
            'structure' => [],
            'indexes' => [],
            'statistics' => [],
            'suggestions' => []
        ];
        
        // Get table structure
        $structure = $this->query("DESCRIBE `{$table}`");
        $analysis['structure'] = $structure;
        
        // Get indexes
        $indexes = $this->query("SHOW INDEX FROM `{$table}`");
        $analysis['indexes'] = $indexes;
        
        // Get table statistics
        $stats = $this->query("SHOW TABLE STATUS LIKE '{$table}'");
        if (!empty($stats)) {
            $analysis['statistics'] = $stats[0];
        }
        
        // Analyze and suggest optimizations
        $this->analyzeTableStructure($analysis);
        $this->analyzeTableIndexes($analysis);
        
        return $analysis;
    }
    
    /**
     * Clear query cache for specific patterns
     */
    public function clearQueryCache($patterns = [])
    {
        if (empty($patterns)) {
            $patterns = ['*'];
        }
        
        foreach ($patterns as $pattern) {
            $this->cache->flush($pattern);
        }
    }
    
    /**
     * Private helper methods
     */
    private function isSelectQuery($sql)
    {
        return stripos(trim($sql), 'SELECT') === 0;
    }
    
    private function logQuery($sql, $params, $executionTime, $cached, $error = null)
    {
        $this->queryLog[] = [
            'sql' => $sql,
            'params' => $params,
            'execution_time' => $executionTime,
            'cached' => $cached,
            'error' => $error,
            'timestamp' => time()
        ];
    }
    
    private function insertChunk($table, $chunk)
    {
        if (empty($chunk)) {
            return 0;
        }
        
        $columns = array_keys($chunk[0]);
        $placeholders = '(' . str_repeat('?,', count($columns) - 1) . '?)';
        $values = str_repeat($placeholders . ',', count($chunk) - 1) . $placeholders;
        
        $sql = "INSERT INTO `{$table}` (`" . implode('`, `', $columns) . "`) VALUES {$values}";
        
        $params = [];
        foreach ($chunk as $row) {
            foreach ($columns as $column) {
                $params[] = $row[$column];
            }
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->rowCount();
    }
    
    private function buildCountQuery($sql)
    {
        // Simple approach - wrap the original query
        return "SELECT COUNT(*) as count FROM ({$sql}) as count_query";
    }
    
    private function analyzeTableStructure($analysis)
    {
        $structure = $analysis['structure'];
        
        foreach ($structure as $column) {
            // Check for inefficient data types
            if ($column['Type'] === 'text' || $column['Type'] === 'longtext') {
                $analysis['suggestions'][] = "Consider using VARCHAR instead of TEXT for column '{$column['Field']}' if the content is predictably short";
            }
            
            // Check for missing NOT NULL constraints
            if ($column['Null'] === 'YES' && $column['Key'] !== 'PRI') {
                $analysis['suggestions'][] = "Consider adding NOT NULL constraint to column '{$column['Field']}' if it should always have a value";
            }
        }
    }
    
    private function analyzeTableIndexes($analysis)
    {
        $indexes = $analysis['indexes'];
        $indexNames = array_unique(array_column($indexes, 'Key_name'));
        
        // Check for duplicate indexes
        $indexColumns = [];
        foreach ($indexes as $index) {
            $indexColumns[$index['Key_name']][] = $index['Column_name'];
        }
        
        foreach ($indexColumns as $indexName => $columns) {
            if ($indexName === 'PRIMARY') continue;
            
            foreach ($indexColumns as $otherIndexName => $otherColumns) {
                if ($indexName !== $otherIndexName && $indexName !== 'PRIMARY' && $otherIndexName !== 'PRIMARY') {
                    if (array_slice($otherColumns, 0, count($columns)) === $columns) {
                        $analysis['suggestions'][] = "Index '{$indexName}' might be redundant as it's covered by index '{$otherIndexName}'";
                    }
                }
            }
        }
        
        // Check for missing indexes on foreign keys
        foreach ($analysis['structure'] as $column) {
            if (strpos($column['Field'], '_id') !== false && $column['Key'] === '') {
                $analysis['suggestions'][] = "Consider adding an index on column '{$column['Field']}' as it appears to be a foreign key";
            }
        }
    }
}
