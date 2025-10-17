<?php
/**
 * Database Connection and Query Handler
 * YouTube Interview Curation System
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once __DIR__ . '/youtube_config.php';

class Database {
    private $connection;
    private $statement;
    private $lastInsertId;
    private $queryCount = 0;
    private $queryLog = [];
    
    public function __construct() {
        $this->connect();
    }
    
    /**
     * Establish database connection
     */
    private function connect() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            if (DEBUG_MODE) {
                $this->log("Database connection established successfully");
            }
            
        } catch (PDOException $e) {
            $this->handleError("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute a prepared statement
     */
    public function query($sql, $params = []) {
        try {
            $this->queryCount++;
            
            if (LOG_SQL_QUERIES) {
                $this->queryLog[] = [
                    'sql' => $sql,
                    'params' => $params,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            $this->statement = $this->connection->prepare($sql);
            $result = $this->statement->execute($params);
            
            if (!$result) {
                throw new Exception("Query execution failed");
            }
            
            return $this;
            
        } catch (PDOException $e) {
            $this->handleError("Query failed: " . $e->getMessage() . " | SQL: " . $sql);
            return false;
        }
    }
    
    /**
     * Fetch single row
     */
    public function fetch() {
        if ($this->statement) {
            return $this->statement->fetch();
        }
        return false;
    }
    
    /**
     * Fetch all rows
     */
    public function fetchAll() {
        if ($this->statement) {
            return $this->statement->fetchAll();
        }
        return [];
    }
    
    /**
     * Fetch single column value
     */
    public function fetchColumn($column = 0) {
        if ($this->statement) {
            return $this->statement->fetchColumn($column);
        }
        return false;
    }
    
    /**
     * Get row count
     */
    public function rowCount() {
        if ($this->statement) {
            return $this->statement->rowCount();
        }
        return 0;
    }
    
    /**
     * Get last insert ID
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->connection->rollBack();
    }
    
    /**
     * Insert record and return ID
     */
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        
        if ($this->query($sql, $data)) {
            return $this->connection->lastInsertId();
        }
        
        return false;
    }
    
    /**
     * Update record
     */
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach (array_keys($data) as $key) {
            $setClause[] = "{$key} = :{$key}";
        }
        $setClause = implode(', ', $setClause);
        
        $sql = "UPDATE {$table} SET {$setClause} WHERE {$where}";
        $params = array_merge($data, $whereParams);
        
        return $this->query($sql, $params);
    }
    
    /**
     * Delete record
     */
    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->query($sql, $params);
    }
    
    /**
     * Check if record exists
     */
    public function exists($table, $where, $params = []) {
        $sql = "SELECT 1 FROM {$table} WHERE {$where} LIMIT 1";
        $this->query($sql, $params);
        return $this->fetch() !== false;
    }
    
    /**
     * Get single record
     */
    public function getRow($table, $where, $params = [], $columns = '*') {
        $sql = "SELECT {$columns} FROM {$table} WHERE {$where} LIMIT 1";
        $this->query($sql, $params);
        return $this->fetch();
    }
    
    /**
     * Get multiple records
     */
    public function getRows($table, $where = '1=1', $params = [], $columns = '*', $orderBy = '', $limit = '') {
        $sql = "SELECT {$columns} FROM {$table} WHERE {$where}";
        
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        if ($limit) {
            $sql .= " LIMIT {$limit}";
        }
        
        $this->query($sql, $params);
        return $this->fetchAll();
    }
    
    /**
     * Get count of records
     */
    public function getCount($table, $where = '1=1', $params = []) {
        $sql = "SELECT COUNT(*) FROM {$table} WHERE {$where}";
        $this->query($sql, $params);
        return (int) $this->fetchColumn();
    }
    
    /**
     * Execute raw SQL (use with caution)
     */
    public function raw($sql, $params = []) {
        return $this->query($sql, $params);
    }
    
    /**
     * Get database statistics
     */
    public function getStats() {
        return [
            'query_count' => $this->queryCount,
            'connection_status' => $this->connection ? 'connected' : 'disconnected',
            'database_name' => DB_NAME,
            'charset' => DB_CHARSET
        ];
    }
    
    /**
     * Get query log (for debugging)
     */
    public function getQueryLog() {
        return $this->queryLog;
    }
    
    /**
     * Escape string for LIKE queries
     */
    public function escapeLike($string) {
        return str_replace(['%', '_'], ['\\%', '\\_'], $string);
    }
    
    /**
     * Build WHERE clause from array
     */
    public function buildWhere($conditions, $operator = 'AND') {
        if (empty($conditions)) {
            return ['1=1', []];
        }
        
        $clauses = [];
        $params = [];
        
        foreach ($conditions as $field => $value) {
            if (is_array($value)) {
                // Handle IN clause
                $placeholders = [];
                foreach ($value as $i => $val) {
                    $placeholder = ":{$field}_{$i}";
                    $placeholders[] = $placeholder;
                    $params[$placeholder] = $val;
                }
                $clauses[] = "{$field} IN (" . implode(', ', $placeholders) . ")";
            } else {
                $placeholder = ":{$field}";
                $clauses[] = "{$field} = {$placeholder}";
                $params[$placeholder] = $value;
            }
        }
        
        $whereClause = implode(" {$operator} ", $clauses);
        return [$whereClause, $params];
    }
    
    /**
     * Handle database errors
     */
    private function handleError($message) {
        if (DEBUG_MODE && SHOW_SQL_ERRORS) {
            echo "<div style='background: #ffebee; color: #c62828; padding: 10px; margin: 10px; border-left: 4px solid #c62828;'>";
            echo "<strong>Database Error:</strong> " . htmlspecialchars($message);
            echo "</div>";
        }
        
        // Log error
        $this->log("ERROR: " . $message);
        
        // In production, show generic error
        if (!DEBUG_MODE) {
            throw new Exception("A database error occurred. Please try again later.");
        } else {
            throw new Exception($message);
        }
    }
    
    /**
     * Log message
     */
    private function log($message) {
        if (!is_dir(LOGS_PATH)) {
            mkdir(LOGS_PATH, 0755, true);
        }
        
        $logFile = LOGS_PATH . '/database.log';
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}" . PHP_EOL;
        
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Close connection
     */
    public function close() {
        $this->connection = null;
        $this->statement = null;
    }
    
    /**
     * Destructor
     */
    public function __destruct() {
        $this->close();
    }
}

// Global database instance
$GLOBALS['db'] = new Database();

/**
 * Helper function to get database instance
 */
function getDB() {
    return $GLOBALS['db'];
}

?>
