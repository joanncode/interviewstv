<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class InterviewApiTest extends TestCase
{
    private Client $client;
    private string $baseUrl;
    private string $authToken;
    private array $testUser;
    private array $testInterview;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->baseUrl = $_ENV['API_BASE_URL'] ?? 'http://localhost:8000/api';
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ]
        ]);
        
        $this->setupTestData();
    }

    protected function tearDown(): void
    {
        $this->cleanupTestData();
        parent::tearDown();
    }

    public function testUserRegistrationAndLogin(): void
    {
        // Test user registration
        $registrationData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!'
        ];

        $response = $this->client->post('/auth/register', [
            'json' => $registrationData
        ]);

        $this->assertEquals(201, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('user', $responseData);
        $this->assertArrayHasKey('token', $responseData);
        $this->assertEquals($registrationData['email'], $responseData['user']['email']);

        // Test user login
        $loginData = [
            'email' => $registrationData['email'],
            'password' => $registrationData['password']
        ];

        $response = $this->client->post('/auth/login', [
            'json' => $loginData
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('user', $responseData);
        $this->assertArrayHasKey('token', $responseData);
        
        $this->authToken = $responseData['token'];
        $this->testUser = $responseData['user'];
    }

    public function testCreateInterview(): void
    {
        $this->authenticateTestUser();

        $interviewData = [
            'title' => 'Test Interview - Software Engineer',
            'description' => 'A comprehensive technical interview covering JavaScript, React, and system design.',
            'category' => 'Technology',
            'tags' => ['javascript', 'react', 'frontend', 'system-design'],
            'duration' => 45,
            'difficulty_level' => 'intermediate',
            'is_public' => true
        ];

        $response = $this->client->post('/interviews', [
            'json' => $interviewData,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(201, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('interview', $responseData);
        $this->assertEquals($interviewData['title'], $responseData['interview']['title']);
        $this->assertEquals($interviewData['category'], $responseData['interview']['category']);
        $this->assertEquals('draft', $responseData['interview']['status']);
        
        $this->testInterview = $responseData['interview'];
    }

    public function testGetInterviewsList(): void
    {
        $response = $this->client->get('/interviews');

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('interviews', $responseData);
        $this->assertArrayHasKey('pagination', $responseData);
        $this->assertIsArray($responseData['interviews']);
        
        // Test pagination parameters
        $this->assertArrayHasKey('current_page', $responseData['pagination']);
        $this->assertArrayHasKey('total_pages', $responseData['pagination']);
        $this->assertArrayHasKey('total_items', $responseData['pagination']);
    }

    public function testGetInterviewById(): void
    {
        $this->createTestInterview();

        $response = $this->client->get("/interviews/{$this->testInterview['id']}");

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('interview', $responseData);
        $this->assertEquals($this->testInterview['id'], $responseData['interview']['id']);
        $this->assertEquals($this->testInterview['title'], $responseData['interview']['title']);
    }

    public function testUpdateInterview(): void
    {
        $this->authenticateTestUser();
        $this->createTestInterview();

        $updateData = [
            'title' => 'Updated Test Interview - Senior Software Engineer',
            'description' => 'Updated description with more advanced topics.',
            'difficulty_level' => 'advanced'
        ];

        $response = $this->client->put("/interviews/{$this->testInterview['id']}", [
            'json' => $updateData,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertEquals($updateData['title'], $responseData['interview']['title']);
        $this->assertEquals($updateData['difficulty_level'], $responseData['interview']['difficulty_level']);
    }

    public function testInterviewVideoUpload(): void
    {
        $this->authenticateTestUser();
        $this->createTestInterview();

        // Create a test video file
        $testVideoPath = $this->createTestVideoFile();

        $response = $this->client->post("/interviews/{$this->testInterview['id']}/video", [
            'multipart' => [
                [
                    'name' => 'video',
                    'contents' => fopen($testVideoPath, 'r'),
                    'filename' => 'test-interview.mp4'
                ]
            ],
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('video_url', $responseData);
        $this->assertArrayHasKey('processing_status', $responseData);
        
        // Clean up test file
        unlink($testVideoPath);
    }

    public function testInterviewAnalysis(): void
    {
        $this->authenticateTestUser();
        $this->createTestInterview();

        // Start analysis
        $response = $this->client->post("/interviews/{$this->testInterview['id']}/analyze", [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(202, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('status', $responseData);
        $this->assertEquals('processing', $responseData['status']);

        // Check analysis status
        $response = $this->client->get("/interviews/{$this->testInterview['id']}/analysis", [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('status', $responseData);
        $this->assertContains($responseData['status'], ['processing', 'completed', 'failed']);
    }

    public function testSearchInterviews(): void
    {
        $searchParams = [
            'q' => 'javascript',
            'category' => 'Technology',
            'difficulty' => 'intermediate',
            'limit' => 10
        ];

        $response = $this->client->get('/search?' . http_build_query($searchParams));

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('results', $responseData);
        $this->assertArrayHasKey('total_results', $responseData);
        $this->assertArrayHasKey('search_time', $responseData);
        $this->assertIsArray($responseData['results']);
    }

    public function testGetRecommendations(): void
    {
        $this->authenticateTestUser();

        $response = $this->client->get('/recommendations', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('interviews', $responseData);
        $this->assertArrayHasKey('skills', $responseData);
        $this->assertArrayHasKey('people', $responseData);
        $this->assertIsArray($responseData['interviews']);
    }

    public function testInterviewRatingAndReview(): void
    {
        $this->authenticateTestUser();
        $this->createTestInterview();

        $ratingData = [
            'rating' => 4,
            'review' => 'Great interview with comprehensive technical questions. Very helpful for preparation.',
            'helpful_aspects' => ['technical_depth', 'real_world_scenarios', 'clear_explanations']
        ];

        $response = $this->client->post("/interviews/{$this->testInterview['id']}/rate", [
            'json' => $ratingData,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(201, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('rating', $responseData);
        $this->assertEquals($ratingData['rating'], $responseData['rating']['rating']);
        $this->assertEquals($ratingData['review'], $responseData['rating']['review']);
    }

    public function testInterviewStatistics(): void
    {
        $this->authenticateTestUser();
        $this->createTestInterview();

        $response = $this->client->get("/interviews/{$this->testInterview['id']}/stats", [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ]
        ]);

        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('views', $responseData);
        $this->assertArrayHasKey('ratings', $responseData);
        $this->assertArrayHasKey('average_rating', $responseData);
        $this->assertArrayHasKey('completion_rate', $responseData);
    }

    public function testUnauthorizedAccess(): void
    {
        $this->expectException(RequestException::class);

        // Try to create interview without authentication
        $this->client->post('/interviews', [
            'json' => ['title' => 'Unauthorized Interview']
        ]);
    }

    public function testInvalidInterviewId(): void
    {
        $response = $this->client->get('/interviews/99999', [
            'http_errors' => false
        ]);

        $this->assertEquals(404, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('error', $responseData);
        $this->assertEquals('Interview not found', $responseData['error']);
    }

    public function testValidationErrors(): void
    {
        $this->authenticateTestUser();

        // Test with invalid data
        $invalidData = [
            'title' => '', // Empty title
            'category' => 'InvalidCategory',
            'duration' => -5 // Negative duration
        ];

        $response = $this->client->post('/interviews', [
            'json' => $invalidData,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->authToken
            ],
            'http_errors' => false
        ]);

        $this->assertEquals(422, $response->getStatusCode());
        
        $responseData = json_decode($response->getBody()->getContents(), true);
        $this->assertArrayHasKey('errors', $responseData);
        $this->assertArrayHasKey('title', $responseData['errors']);
        $this->assertArrayHasKey('duration', $responseData['errors']);
    }

    public function testRateLimiting(): void
    {
        // Make multiple rapid requests to test rate limiting
        $responses = [];
        for ($i = 0; $i < 100; $i++) {
            try {
                $response = $this->client->get('/interviews', [
                    'http_errors' => false
                ]);
                $responses[] = $response->getStatusCode();
            } catch (RequestException $e) {
                $responses[] = $e->getResponse()->getStatusCode();
            }
        }

        // Should eventually hit rate limit (429)
        $this->assertContains(429, $responses, 'Rate limiting should be triggered');
    }

    private function setupTestData(): void
    {
        // Initialize test data
        $this->testUser = [];
        $this->testInterview = [];
        $this->authToken = '';
    }

    private function cleanupTestData(): void
    {
        // Clean up test interview
        if (!empty($this->testInterview) && !empty($this->authToken)) {
            try {
                $this->client->delete("/interviews/{$this->testInterview['id']}", [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->authToken
                    ],
                    'http_errors' => false
                ]);
            } catch (\Exception $e) {
                // Ignore cleanup errors
            }
        }

        // Clean up test user
        if (!empty($this->testUser) && !empty($this->authToken)) {
            try {
                $this->client->delete("/users/{$this->testUser['id']}", [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->authToken
                    ],
                    'http_errors' => false
                ]);
            } catch (\Exception $e) {
                // Ignore cleanup errors
            }
        }
    }

    private function authenticateTestUser(): void
    {
        if (empty($this->authToken)) {
            $this->testUserRegistrationAndLogin();
        }
    }

    private function createTestInterview(): void
    {
        if (empty($this->testInterview)) {
            $this->testCreateInterview();
        }
    }

    private function createTestVideoFile(): string
    {
        $testVideoPath = sys_get_temp_dir() . '/test-interview-' . uniqid() . '.mp4';
        
        // Create a minimal MP4 file for testing
        $mp4Header = hex2bin('000000206674797069736f6d0000020069736f6d69736f32617663316d703431');
        file_put_contents($testVideoPath, $mp4Header);
        
        return $testVideoPath;
    }
}
