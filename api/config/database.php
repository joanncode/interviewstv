<?php
/**
 * Database Configuration for Interviews.tv
 * MariaDB connection settings and PDO setup
 */

class Database {
    private $host = 'localhost';
    private $db_name = 'interviews_tv';
    private $username = 'interviews_user';
    private $password = 'interviews_pass';
    private $charset = 'utf8mb4';
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // Try SQLite first for development
            if (file_exists(__DIR__ . '/../../interviews_tv.db') || !$this->isMySQLAvailable()) {
                $this->conn = $this->getSQLiteConnection();
            } else {
                $this->conn = $this->getMySQLConnection();
            }
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            // Fallback to SQLite if MySQL fails
            try {
                $this->conn = $this->getSQLiteConnection();
            } catch(PDOException $sqliteException) {
                error_log("SQLite fallback failed: " . $sqliteException->getMessage());
                throw new Exception("Database connection failed: " . $exception->getMessage());
            }
        }

        return $this->conn;
    }

    private function getMySQLConnection() {
        // Try different connection methods
        $connectionMethods = [
            // Method 1: Standard connection
            [
                'dsn' => "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset,
                'user' => $this->username,
                'pass' => $this->password
            ],
            // Method 2: Socket connection for root
            [
                'dsn' => "mysql:unix_socket=/var/run/mysqld/mysqld.sock;dbname=" . $this->db_name . ";charset=" . $this->charset,
                'user' => 'root',
                'pass' => ''
            ],
            // Method 3: Create database first, then connect
            [
                'dsn' => "mysql:host=" . $this->host . ";charset=" . $this->charset,
                'user' => $this->username,
                'pass' => $this->password,
                'create_db' => true
            ]
        ];

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        foreach ($connectionMethods as $method) {
            try {
                $pdo = new PDO($method['dsn'], $method['user'], $method['pass'], $options);

                // If this method requires creating the database first
                if (isset($method['create_db']) && $method['create_db']) {
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . $this->db_name . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $pdo->exec("USE " . $this->db_name);
                }

                return $pdo;
            } catch (PDOException $e) {
                // Continue to next method
                continue;
            }
        }

        // If all methods fail, throw the last exception
        throw new PDOException("Could not connect to MySQL database using any method");
    }

    private function getSQLiteConnection() {
        $dbPath = __DIR__ . '/../../interviews_tv.db';
        $dsn = "sqlite:" . $dbPath;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        return new PDO($dsn, null, null, $options);
    }

    private function isMySQLAvailable() {
        try {
            $testDsn = "mysql:host=" . $this->host;
            $testConn = new PDO($testDsn, $this->username, $this->password);
            $testConn = null;
            return true;
        } catch(PDOException $e) {
            return false;
        }
    }

    public function closeConnection() {
        $this->conn = null;
    }
}

/**
 * Environment-specific database configuration
 * Modify these settings based on your environment
 */
class DatabaseConfig {
    public static function getConfig($environment = 'development') {
        $configs = [
            'development' => [
                'host' => 'localhost',
                'db_name' => 'interviews_tv',
                'username' => 'root',
                'password' => '',
                'charset' => 'utf8mb4'
            ],
            'production' => [
                'host' => 'localhost',
                'db_name' => 'interviews_tv_prod',
                'username' => 'interviews_user',
                'password' => 'secure_password_here',
                'charset' => 'utf8mb4'
            ],
            'testing' => [
                'host' => 'localhost',
                'db_name' => 'interviews_tv_test',
                'username' => 'root',
                'password' => '',
                'charset' => 'utf8mb4'
            ]
        ];

        return $configs[$environment] ?? $configs['development'];
    }
}
?>
