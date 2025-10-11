<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * API Documentation Service for OpenAPI/Swagger Documentation
 */
class APIDocumentationService
{
    private PDO $pdo;
    private array $config;
    private array $apiSpec;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'api_version' => '1.0.0',
            'api_title' => 'Interviews.tv API',
            'api_description' => 'Comprehensive API for the Interviews.tv social networking platform',
            'base_url' => $_ENV['API_BASE_URL'] ?? 'https://api.interviews.tv',
            'contact_email' => 'api@interviews.tv',
            'license' => 'MIT',
            'rate_limit' => 1000,
            'rate_limit_window' => 3600
        ], $config);

        $this->initializeAPISpec();
    }

    /**
     * Get complete OpenAPI specification
     */
    public function getOpenAPISpec(): array
    {
        return $this->apiSpec;
    }

    /**
     * Get API documentation for specific endpoint
     */
    public function getEndpointDocumentation(string $path, string $method): ?array
    {
        $normalizedPath = $this->normalizePath($path);
        
        if (isset($this->apiSpec['paths'][$normalizedPath][$method])) {
            return $this->apiSpec['paths'][$normalizedPath][$method];
        }
        
        return null;
    }

    /**
     * Generate SDK code for different languages
     */
    public function generateSDK(string $language): array
    {
        switch (strtolower($language)) {
            case 'javascript':
                return $this->generateJavaScriptSDK();
            case 'python':
                return $this->generatePythonSDK();
            case 'php':
                return $this->generatePHPSDK();
            case 'curl':
                return $this->generateCurlExamples();
            default:
                throw new Exception("Unsupported SDK language: {$language}");
        }
    }

    /**
     * Get API usage statistics
     */
    public function getAPIUsageStats(string $period = '30d'): array
    {
        $dateFilter = $this->getDateFilter($period);
        
        $stmt = $this->pdo->prepare("
            SELECT 
                endpoint,
                method,
                COUNT(*) as request_count,
                AVG(response_time) as avg_response_time,
                COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_count,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM api_logs 
            WHERE created_at {$dateFilter['condition']}
            GROUP BY endpoint, method
            ORDER BY request_count DESC
        ");
        
        $stmt->execute($dateFilter['params']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Log API usage for analytics
     */
    public function logAPIUsage(array $requestData): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO api_logs (
                endpoint, method, status_code, response_time,
                user_id, ip_address, user_agent, request_size,
                response_size, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $requestData['endpoint'] ?? '',
            $requestData['method'] ?? '',
            $requestData['status_code'] ?? 200,
            $requestData['response_time'] ?? 0,
            $requestData['user_id'] ?? null,
            $requestData['ip_address'] ?? '',
            $requestData['user_agent'] ?? '',
            $requestData['request_size'] ?? 0,
            $requestData['response_size'] ?? 0
        ]);
    }

    /**
     * Initialize OpenAPI specification
     */
    private function initializeAPISpec(): void
    {
        $this->apiSpec = [
            'openapi' => '3.0.3',
            'info' => [
                'title' => $this->config['api_title'],
                'description' => $this->config['api_description'],
                'version' => $this->config['api_version'],
                'contact' => [
                    'email' => $this->config['contact_email']
                ],
                'license' => [
                    'name' => $this->config['license']
                ]
            ],
            'servers' => [
                [
                    'url' => $this->config['base_url'],
                    'description' => 'Production server'
                ]
            ],
            'components' => $this->getComponents(),
            'paths' => $this->getPaths(),
            'security' => [
                ['bearerAuth' => []]
            ]
        ];
    }

    /**
     * Get OpenAPI components (schemas, security schemes, etc.)
     */
    private function getComponents(): array
    {
        return [
            'securitySchemes' => [
                'bearerAuth' => [
                    'type' => 'http',
                    'scheme' => 'bearer',
                    'bearerFormat' => 'JWT'
                ]
            ],
            'schemas' => [
                'User' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'integer'],
                        'name' => ['type' => 'string'],
                        'email' => ['type' => 'string', 'format' => 'email'],
                        'profile_image_url' => ['type' => 'string', 'format' => 'uri'],
                        'bio' => ['type' => 'string'],
                        'location' => ['type' => 'string'],
                        'website' => ['type' => 'string', 'format' => 'uri'],
                        'verified' => ['type' => 'boolean'],
                        'created_at' => ['type' => 'string', 'format' => 'date-time']
                    ]
                ],
                'Interview' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'integer'],
                        'title' => ['type' => 'string'],
                        'description' => ['type' => 'string'],
                        'video_url' => ['type' => 'string', 'format' => 'uri'],
                        'thumbnail_url' => ['type' => 'string', 'format' => 'uri'],
                        'duration' => ['type' => 'integer'],
                        'view_count' => ['type' => 'integer'],
                        'like_count' => ['type' => 'integer'],
                        'comment_count' => ['type' => 'integer'],
                        'tags' => ['type' => 'array', 'items' => ['type' => 'string']],
                        'user' => ['$ref' => '#/components/schemas/User'],
                        'created_at' => ['type' => 'string', 'format' => 'date-time']
                    ]
                ],
                'Comment' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'integer'],
                        'content' => ['type' => 'string'],
                        'user' => ['$ref' => '#/components/schemas/User'],
                        'like_count' => ['type' => 'integer'],
                        'reply_count' => ['type' => 'integer'],
                        'created_at' => ['type' => 'string', 'format' => 'date-time']
                    ]
                ],
                'Business' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'integer'],
                        'name' => ['type' => 'string'],
                        'description' => ['type' => 'string'],
                        'industry' => ['type' => 'string'],
                        'website' => ['type' => 'string', 'format' => 'uri'],
                        'logo_url' => ['type' => 'string', 'format' => 'uri'],
                        'location' => ['type' => 'string'],
                        'employee_count' => ['type' => 'string'],
                        'verified' => ['type' => 'boolean'],
                        'created_at' => ['type' => 'string', 'format' => 'date-time']
                    ]
                ],
                'Error' => [
                    'type' => 'object',
                    'properties' => [
                        'error' => ['type' => 'string'],
                        'message' => ['type' => 'string'],
                        'code' => ['type' => 'integer']
                    ]
                ],
                'PaginatedResponse' => [
                    'type' => 'object',
                    'properties' => [
                        'data' => ['type' => 'array'],
                        'pagination' => [
                            'type' => 'object',
                            'properties' => [
                                'current_page' => ['type' => 'integer'],
                                'per_page' => ['type' => 'integer'],
                                'total' => ['type' => 'integer'],
                                'total_pages' => ['type' => 'integer'],
                                'has_next' => ['type' => 'boolean'],
                                'has_prev' => ['type' => 'boolean']
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * Get API paths and operations
     */
    private function getPaths(): array
    {
        return [
            '/auth/login' => [
                'post' => [
                    'tags' => ['Authentication'],
                    'summary' => 'User login',
                    'description' => 'Authenticate user and return JWT token',
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'email' => ['type' => 'string', 'format' => 'email'],
                                        'password' => ['type' => 'string']
                                    ],
                                    'required' => ['email', 'password']
                                ]
                            ]
                        ]
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Login successful',
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'token' => ['type' => 'string'],
                                            'user' => ['$ref' => '#/components/schemas/User']
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        '401' => [
                            'description' => 'Invalid credentials',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Error']
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            '/interviews' => [
                'get' => [
                    'tags' => ['Interviews'],
                    'summary' => 'Get interviews',
                    'description' => 'Retrieve a paginated list of interviews',
                    'parameters' => [
                        [
                            'name' => 'page',
                            'in' => 'query',
                            'schema' => ['type' => 'integer', 'default' => 1]
                        ],
                        [
                            'name' => 'limit',
                            'in' => 'query',
                            'schema' => ['type' => 'integer', 'default' => 20, 'maximum' => 100]
                        ],
                        [
                            'name' => 'search',
                            'in' => 'query',
                            'schema' => ['type' => 'string']
                        ],
                        [
                            'name' => 'tags',
                            'in' => 'query',
                            'schema' => ['type' => 'string']
                        ]
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'List of interviews',
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'allOf' => [
                                            ['$ref' => '#/components/schemas/PaginatedResponse'],
                                            [
                                                'type' => 'object',
                                                'properties' => [
                                                    'data' => [
                                                        'type' => 'array',
                                                        'items' => ['$ref' => '#/components/schemas/Interview']
                                                    ]
                                                ]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ],
                'post' => [
                    'tags' => ['Interviews'],
                    'summary' => 'Create interview',
                    'description' => 'Create a new interview',
                    'security' => [['bearerAuth' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'title' => ['type' => 'string'],
                                        'description' => ['type' => 'string'],
                                        'video_url' => ['type' => 'string', 'format' => 'uri'],
                                        'tags' => ['type' => 'array', 'items' => ['type' => 'string']]
                                    ],
                                    'required' => ['title', 'video_url']
                                ]
                            ]
                        ]
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Interview created',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Interview']
                                ]
                            ]
                        ],
                        '401' => [
                            'description' => 'Unauthorized',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Error']
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            '/interviews/{id}' => [
                'get' => [
                    'tags' => ['Interviews'],
                    'summary' => 'Get interview by ID',
                    'description' => 'Retrieve a specific interview by its ID',
                    'parameters' => [
                        [
                            'name' => 'id',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'integer']
                        ]
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Interview details',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Interview']
                                ]
                            ]
                        ],
                        '404' => [
                            'description' => 'Interview not found',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Error']
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            '/users/{id}' => [
                'get' => [
                    'tags' => ['Users'],
                    'summary' => 'Get user profile',
                    'description' => 'Retrieve user profile information',
                    'parameters' => [
                        [
                            'name' => 'id',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'integer']
                        ]
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'User profile',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/User']
                                ]
                            ]
                        ],
                        '404' => [
                            'description' => 'User not found',
                            'content' => [
                                'application/json' => [
                                    'schema' => ['$ref' => '#/components/schemas/Error']
                                ]
                            ]
                        ]
                    ]
                ]
            ],
            '/businesses' => [
                'get' => [
                    'tags' => ['Businesses'],
                    'summary' => 'Get businesses',
                    'description' => 'Retrieve a paginated list of businesses',
                    'parameters' => [
                        [
                            'name' => 'page',
                            'in' => 'query',
                            'schema' => ['type' => 'integer', 'default' => 1]
                        ],
                        [
                            'name' => 'limit',
                            'in' => 'query',
                            'schema' => ['type' => 'integer', 'default' => 20]
                        ],
                        [
                            'name' => 'industry',
                            'in' => 'query',
                            'schema' => ['type' => 'string']
                        ]
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'List of businesses',
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'allOf' => [
                                            ['$ref' => '#/components/schemas/PaginatedResponse'],
                                            [
                                                'type' => 'object',
                                                'properties' => [
                                                    'data' => [
                                                        'type' => 'array',
                                                        'items' => ['$ref' => '#/components/schemas/Business']
                                                    ]
                                                ]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }

    /**
     * Generate JavaScript SDK
     */
    private function generateJavaScriptSDK(): array
    {
        $code = "
class InterviewsTVAPI {
    constructor(apiKey, baseURL = '{$this->config['base_url']}') {
        this.apiKey = apiKey;
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `\${this.baseURL}\${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer \${this.apiKey}`,
                ...options.headers
            },
            ...options
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`API Error: \${response.status} \${response.statusText}`);
        }

        return response.json();
    }

    // Authentication
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    // Interviews
    async getInterviews(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/interviews?\${query}`);
    }

    async getInterview(id) {
        return this.request(`/interviews/\${id}`);
    }

    async createInterview(data) {
        return this.request('/interviews', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Users
    async getUser(id) {
        return this.request(`/users/\${id}`);
    }

    // Businesses
    async getBusinesses(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/businesses?\${query}`);
    }
}

// Usage example:
// const api = new InterviewsTVAPI('your-api-key');
// const interviews = await api.getInterviews({ page: 1, limit: 10 });
";

        return [
            'language' => 'javascript',
            'code' => $code,
            'filename' => 'interviews-tv-api.js'
        ];
    }

    /**
     * Generate Python SDK
     */
    private function generatePythonSDK(): array
    {
        $code = "
import requests
from typing import Dict, List, Optional

class InterviewsTVAPI:
    def __init__(self, api_key: str, base_url: str = '{$this->config['base_url']}'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f'{self.base_url}{endpoint}'
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    # Authentication
    def login(self, email: str, password: str) -> Dict:
        return self._request('POST', '/auth/login', json={
            'email': email,
            'password': password
        })

    # Interviews
    def get_interviews(self, **params) -> Dict:
        return self._request('GET', '/interviews', params=params)

    def get_interview(self, interview_id: int) -> Dict:
        return self._request('GET', f'/interviews/{interview_id}')

    def create_interview(self, data: Dict) -> Dict:
        return self._request('POST', '/interviews', json=data)

    # Users
    def get_user(self, user_id: int) -> Dict:
        return self._request('GET', f'/users/{user_id}')

    # Businesses
    def get_businesses(self, **params) -> Dict:
        return self._request('GET', '/businesses', params=params)

# Usage example:
# api = InterviewsTVAPI('your-api-key')
# interviews = api.get_interviews(page=1, limit=10)
";

        return [
            'language' => 'python',
            'code' => $code,
            'filename' => 'interviews_tv_api.py'
        ];
    }

    /**
     * Generate PHP SDK
     */
    private function generatePHPSDK(): array
    {
        $code = "
<?php

class InterviewsTVAPI
{
    private string \$apiKey;
    private string \$baseURL;

    public function __construct(string \$apiKey, string \$baseURL = '{$this->config['base_url']}')
    {
        \$this->apiKey = \$apiKey;
        \$this->baseURL = \$baseURL;
    }

    private function request(string \$method, string \$endpoint, array \$data = []): array
    {
        \$url = \$this->baseURL . \$endpoint;
        
        \$options = [
            CURLOPT_URL => \$url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . \$this->apiKey
            ]
        ];

        if (\$method === 'POST') {
            \$options[CURLOPT_POST] = true;
            \$options[CURLOPT_POSTFIELDS] = json_encode(\$data);
        }

        \$curl = curl_init();
        curl_setopt_array(\$curl, \$options);
        
        \$response = curl_exec(\$curl);
        \$httpCode = curl_getinfo(\$curl, CURLINFO_HTTP_CODE);
        curl_close(\$curl);

        if (\$httpCode >= 400) {
            throw new Exception('API Error: ' . \$httpCode);
        }

        return json_decode(\$response, true);
    }

    // Authentication
    public function login(string \$email, string \$password): array
    {
        return \$this->request('POST', '/auth/login', [
            'email' => \$email,
            'password' => \$password
        ]);
    }

    // Interviews
    public function getInterviews(array \$params = []): array
    {
        \$query = http_build_query(\$params);
        return \$this->request('GET', '/interviews?' . \$query);
    }

    public function getInterview(int \$id): array
    {
        return \$this->request('GET', '/interviews/' . \$id);
    }

    public function createInterview(array \$data): array
    {
        return \$this->request('POST', '/interviews', \$data);
    }

    // Users
    public function getUser(int \$id): array
    {
        return \$this->request('GET', '/users/' . \$id);
    }

    // Businesses
    public function getBusinesses(array \$params = []): array
    {
        \$query = http_build_query(\$params);
        return \$this->request('GET', '/businesses?' . \$query);
    }
}

// Usage example:
// \$api = new InterviewsTVAPI('your-api-key');
// \$interviews = \$api->getInterviews(['page' => 1, 'limit' => 10]);
";

        return [
            'language' => 'php',
            'code' => $code,
            'filename' => 'InterviewsTVAPI.php'
        ];
    }

    /**
     * Generate cURL examples
     */
    private function generateCurlExamples(): array
    {
        $examples = [
            'login' => "curl -X POST {$this->config['base_url']}/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{
    \"email\": \"user@example.com\",
    \"password\": \"password123\"
  }'",
            
            'get_interviews' => "curl -X GET '{$this->config['base_url']}/interviews?page=1&limit=10' \\
  -H 'Authorization: Bearer YOUR_API_TOKEN'",
            
            'create_interview' => "curl -X POST {$this->config['base_url']}/interviews \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_API_TOKEN' \\
  -d '{
    \"title\": \"My Interview\",
    \"description\": \"Interview description\",
    \"video_url\": \"https://example.com/video.mp4\",
    \"tags\": [\"technology\", \"startup\"]
  }'",
            
            'get_user' => "curl -X GET {$this->config['base_url']}/users/123 \\
  -H 'Authorization: Bearer YOUR_API_TOKEN'"
        ];

        return [
            'language' => 'curl',
            'examples' => $examples
        ];
    }

    private function normalizePath(string $path): string
    {
        return '/' . trim($path, '/');
    }

    private function getDateFilter(string $period): array
    {
        switch ($period) {
            case '7d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                    'params' => []
                ];
            case '30d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
            default:
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
        }
    }
}
