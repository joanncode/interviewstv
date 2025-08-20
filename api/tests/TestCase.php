<?php

namespace Tests;

use PHPUnit\Framework\TestCase as BaseTestCase;
use App\Models\User;
use App\Http\Request;
use App\Http\Response;

abstract class TestCase extends BaseTestCase
{
    protected $pdo;
    protected $testUser;
    protected $adminUser;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Get database connection
        $this->pdo = $this->getConnection();
        
        // Clean database before each test
        $this->cleanDatabase();
        
        // Create test users
        $this->createTestUsers();
    }
    
    protected function tearDown(): void
    {
        // Clean database after each test
        $this->cleanDatabase();
        
        parent::tearDown();
    }
    
    /**
     * Get database connection
     */
    protected function getConnection()
    {
        $config = config('database.connections.mysql');
        
        return new \PDO(
            "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}",
            $config['username'],
            $config['password'],
            $config['options']
        );
    }
    
    /**
     * Clean database tables
     */
    protected function cleanDatabase()
    {
        $tables = [
            'notification_analytics',
            'notification_deliveries', 
            'notification_digest',
            'notification_subscriptions',
            'notification_batches',
            'notification_channels',
            'notification_preferences',
            'notifications',
            'media',
            'event_attendees',
            'events',
            'business_verifications',
            'businesses',
            'follows',
            'likes',
            'comments',
            'interviews',
            'user_sessions',
            'users'
        ];
        
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        
        foreach ($tables as $table) {
            try {
                $this->pdo->exec("TRUNCATE TABLE `{$table}`");
            } catch (\PDOException $e) {
                // Ignore if table doesn't exist
            }
        }
        
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    /**
     * Create test users
     */
    protected function createTestUsers()
    {
        // Create regular test user
        $this->testUser = $this->createUser([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => password_hash('password123', PASSWORD_DEFAULT),
            'role' => 'user',
            'email_verified' => true
        ]);
        
        // Create admin test user
        $this->adminUser = $this->createUser([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => password_hash('admin123', PASSWORD_DEFAULT),
            'role' => 'admin',
            'email_verified' => true
        ]);
    }
    
    /**
     * Create a test user
     */
    protected function createUser($data = [])
    {
        $defaultData = [
            'name' => 'Test User ' . uniqid(),
            'email' => 'user' . uniqid() . '@example.com',
            'password' => password_hash('password123', PASSWORD_DEFAULT),
            'role' => 'user',
            'email_verified' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $userData = array_merge($defaultData, $data);
        
        $sql = "INSERT INTO users (name, email, password, role, email_verified, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $userData['name'],
            $userData['email'],
            $userData['password'],
            $userData['role'],
            $userData['email_verified'],
            $userData['created_at'],
            $userData['updated_at']
        ]);
        
        $userId = $this->pdo->lastInsertId();
        
        return User::findById($userId);
    }
    
    /**
     * Create a test interview
     */
    protected function createInterview($userId = null, $data = [])
    {
        $userId = $userId ?: $this->testUser['id'];
        
        $defaultData = [
            'title' => 'Test Interview ' . uniqid(),
            'company' => 'Test Company',
            'position' => 'Software Developer',
            'content' => 'This is a test interview content.',
            'status' => 'published',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $interviewData = array_merge($defaultData, $data);
        
        $sql = "INSERT INTO interviews (user_id, title, company, position, content, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $userId,
            $interviewData['title'],
            $interviewData['company'],
            $interviewData['position'],
            $interviewData['content'],
            $interviewData['status'],
            $interviewData['created_at'],
            $interviewData['updated_at']
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Create a test comment
     */
    protected function createComment($entityType, $entityId, $userId = null, $data = [])
    {
        $userId = $userId ?: $this->testUser['id'];
        
        $defaultData = [
            'content' => 'This is a test comment.',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $commentData = array_merge($defaultData, $data);
        
        $sql = "INSERT INTO comments (user_id, commentable_type, commentable_id, content, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $userId,
            $entityType,
            $entityId,
            $commentData['content'],
            $commentData['created_at'],
            $commentData['updated_at']
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Create a mock request
     */
    protected function createRequest($method = 'GET', $uri = '/', $data = [], $headers = [])
    {
        $_SERVER['REQUEST_METHOD'] = $method;
        $_SERVER['REQUEST_URI'] = $uri;
        $_SERVER['HTTP_HOST'] = 'localhost';
        $_SERVER['SERVER_NAME'] = 'localhost';
        $_SERVER['SERVER_PORT'] = '80';
        $_SERVER['HTTPS'] = 'off';
        
        // Set headers
        foreach ($headers as $key => $value) {
            $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $key))] = $value;
        }
        
        // Set request data
        if ($method === 'GET') {
            $_GET = $data;
        } else {
            $_POST = $data;
        }
        
        return new Request();
    }
    
    /**
     * Create authenticated request
     */
    protected function createAuthenticatedRequest($method = 'GET', $uri = '/', $data = [], $user = null)
    {
        $user = $user ?: $this->testUser;
        
        // Create session for user
        $sessionId = $this->createUserSession($user['id']);
        
        $headers = [
            'Authorization' => 'Bearer ' . $sessionId,
            'Content-Type' => 'application/json'
        ];
        
        return $this->createRequest($method, $uri, $data, $headers);
    }
    
    /**
     * Create user session
     */
    protected function createUserSession($userId)
    {
        $sessionId = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour
        
        $sql = "INSERT INTO user_sessions (id, user_id, expires_at, created_at) 
                VALUES (?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $sessionId,
            $userId,
            $expiresAt,
            date('Y-m-d H:i:s')
        ]);
        
        return $sessionId;
    }
    
    /**
     * Assert JSON response
     */
    protected function assertJsonResponse($response, $expectedStatus = 200)
    {
        $this->assertInstanceOf(Response::class, $response);
        $this->assertEquals($expectedStatus, $response->getStatusCode());
        
        $content = $response->getContent();
        $this->assertJson($content);
        
        return json_decode($content, true);
    }
    
    /**
     * Assert successful JSON response
     */
    protected function assertSuccessResponse($response, $message = null)
    {
        $data = $this->assertJsonResponse($response, 200);
        $this->assertTrue($data['success']);
        
        if ($message) {
            $this->assertEquals($message, $data['message']);
        }
        
        return $data;
    }
    
    /**
     * Assert error JSON response
     */
    protected function assertErrorResponse($response, $expectedStatus = 400, $message = null)
    {
        $data = $this->assertJsonResponse($response, $expectedStatus);
        $this->assertFalse($data['success']);
        
        if ($message) {
            $this->assertStringContainsString($message, $data['message']);
        }
        
        return $data;
    }
    
    /**
     * Assert database has record
     */
    protected function assertDatabaseHas($table, $data)
    {
        $conditions = [];
        $values = [];
        
        foreach ($data as $column => $value) {
            $conditions[] = "`{$column}` = ?";
            $values[] = $value;
        }
        
        $sql = "SELECT COUNT(*) FROM `{$table}` WHERE " . implode(' AND ', $conditions);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        $count = $stmt->fetchColumn();
        
        $this->assertGreaterThan(0, $count, "Failed asserting that table '{$table}' contains matching record.");
    }
    
    /**
     * Assert database missing record
     */
    protected function assertDatabaseMissing($table, $data)
    {
        $conditions = [];
        $values = [];
        
        foreach ($data as $column => $value) {
            $conditions[] = "`{$column}` = ?";
            $values[] = $value;
        }
        
        $sql = "SELECT COUNT(*) FROM `{$table}` WHERE " . implode(' AND ', $conditions);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        $count = $stmt->fetchColumn();
        
        $this->assertEquals(0, $count, "Failed asserting that table '{$table}' does not contain matching record.");
    }
    
    /**
     * Get database record count
     */
    protected function getDatabaseCount($table, $conditions = [])
    {
        $whereClause = '';
        $values = [];
        
        if (!empty($conditions)) {
            $conditionParts = [];
            foreach ($conditions as $column => $value) {
                $conditionParts[] = "`{$column}` = ?";
                $values[] = $value;
            }
            $whereClause = ' WHERE ' . implode(' AND ', $conditionParts);
        }
        
        $sql = "SELECT COUNT(*) FROM `{$table}`{$whereClause}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return (int) $stmt->fetchColumn();
    }
}
