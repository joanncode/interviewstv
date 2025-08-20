import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    // Ramp-up
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '10m', target: 50 },  // Stay at 50 users for 10 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '10m', target: 100 }, // Stay at 100 users for 10 minutes
    { duration: '5m', target: 0 },    // Ramp down to 0 users over 5 minutes
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    error_rate: ['rate<0.01'],
    response_time: ['p(95)<500'],
    
    // Specific endpoint thresholds
    'http_req_duration{endpoint:api}': ['p(95)<300'],
    'http_req_duration{endpoint:search}': ['p(95)<800'],
    'http_req_duration{endpoint:analysis}': ['p(95)<2000'],
  },
  ext: {
    loadimpact: {
      projectID: 3596395,
      name: 'Interviews.tv Load Test'
    }
  }
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8000/api';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

const searchQueries = [
  'javascript',
  'react developer',
  'python programming',
  'system design',
  'frontend interview',
  'backend development',
  'machine learning',
  'data structures'
];

// Authentication helper
function authenticate() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  const loginResponse = http.post(`${API_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth' }
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time OK': (r) => r.timings.duration < 1000,
  });
  
  if (loginResponse.status === 200) {
    const authData = JSON.parse(loginResponse.body);
    return authData.token;
  }
  
  return null;
}

// Main test scenario
export default function() {
  const token = authenticate();
  
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test scenario weights
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Browse interviews
    browseInterviews(headers);
  } else if (scenario < 0.5) {
    // 20% - Search functionality
    searchInterviews(headers);
  } else if (scenario < 0.7) {
    // 20% - View interview details
    viewInterviewDetails(headers);
  } else if (scenario < 0.85) {
    // 15% - User profile operations
    userProfileOperations(headers);
  } else if (scenario < 0.95) {
    // 10% - Create/upload content
    createContent(headers);
  } else {
    // 5% - AI analysis operations
    aiAnalysisOperations(headers);
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

function browseInterviews(headers) {
  // Get interviews list
  const listResponse = http.get(`${API_URL}/interviews?page=1&limit=20`, {
    headers,
    tags: { endpoint: 'api', operation: 'list_interviews' }
  });
  
  check(listResponse, {
    'interviews list loaded': (r) => r.status === 200,
    'interviews list response time OK': (r) => r.timings.duration < 500,
    'interviews list has data': (r) => {
      const data = JSON.parse(r.body);
      return data.interviews && data.interviews.length > 0;
    }
  });
  
  responseTime.add(listResponse.timings.duration);
  requestCount.add(1);
  
  if (listResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  // Get categories
  const categoriesResponse = http.get(`${API_URL}/categories`, {
    headers,
    tags: { endpoint: 'api', operation: 'categories' }
  });
  
  check(categoriesResponse, {
    'categories loaded': (r) => r.status === 200,
    'categories response time OK': (r) => r.timings.duration < 300,
  });
  
  responseTime.add(categoriesResponse.timings.duration);
  requestCount.add(1);
  
  if (categoriesResponse.status !== 200) {
    errorRate.add(1);
  }
}

function searchInterviews(headers) {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  const searchResponse = http.get(`${API_URL}/search?q=${encodeURIComponent(query)}&limit=10`, {
    headers,
    tags: { endpoint: 'search', operation: 'search_interviews' }
  });
  
  check(searchResponse, {
    'search completed': (r) => r.status === 200,
    'search response time OK': (r) => r.timings.duration < 800,
    'search has results': (r) => {
      const data = JSON.parse(r.body);
      return data.results && Array.isArray(data.results);
    }
  });
  
  responseTime.add(searchResponse.timings.duration);
  requestCount.add(1);
  
  if (searchResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  // Get search suggestions
  const suggestionsResponse = http.get(`${API_URL}/search/suggestions?q=${encodeURIComponent(query.substring(0, 3))}`, {
    headers,
    tags: { endpoint: 'search', operation: 'suggestions' }
  });
  
  check(suggestionsResponse, {
    'suggestions loaded': (r) => r.status === 200,
    'suggestions response time OK': (r) => r.timings.duration < 400,
  });
  
  responseTime.add(suggestionsResponse.timings.duration);
  requestCount.add(1);
  
  if (suggestionsResponse.status !== 200) {
    errorRate.add(1);
  }
}

function viewInterviewDetails(headers) {
  // First get a random interview ID
  const listResponse = http.get(`${API_URL}/interviews?page=1&limit=5`, {
    headers,
    tags: { endpoint: 'api', operation: 'list_for_detail' }
  });
  
  if (listResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  const interviews = JSON.parse(listResponse.body).interviews;
  if (!interviews || interviews.length === 0) {
    return;
  }
  
  const randomInterview = interviews[Math.floor(Math.random() * interviews.length)];
  
  // Get interview details
  const detailResponse = http.get(`${API_URL}/interviews/${randomInterview.id}`, {
    headers,
    tags: { endpoint: 'api', operation: 'interview_detail' }
  });
  
  check(detailResponse, {
    'interview detail loaded': (r) => r.status === 200,
    'interview detail response time OK': (r) => r.timings.duration < 600,
  });
  
  responseTime.add(detailResponse.timings.duration);
  requestCount.add(1);
  
  if (detailResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  // Get interview analysis if available
  const analysisResponse = http.get(`${API_URL}/interviews/${randomInterview.id}/analysis`, {
    headers,
    tags: { endpoint: 'analysis', operation: 'get_analysis' }
  });
  
  check(analysisResponse, {
    'analysis request completed': (r) => r.status === 200 || r.status === 404,
    'analysis response time OK': (r) => r.timings.duration < 1000,
  });
  
  responseTime.add(analysisResponse.timings.duration);
  requestCount.add(1);
  
  if (analysisResponse.status !== 200 && analysisResponse.status !== 404) {
    errorRate.add(1);
  }
}

function userProfileOperations(headers) {
  // Get user profile
  const profileResponse = http.get(`${API_URL}/user/profile`, {
    headers,
    tags: { endpoint: 'api', operation: 'user_profile' }
  });
  
  check(profileResponse, {
    'profile loaded': (r) => r.status === 200,
    'profile response time OK': (r) => r.timings.duration < 400,
  });
  
  responseTime.add(profileResponse.timings.duration);
  requestCount.add(1);
  
  if (profileResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  // Get recommendations
  const recommendationsResponse = http.get(`${API_URL}/recommendations`, {
    headers,
    tags: { endpoint: 'api', operation: 'recommendations' }
  });
  
  check(recommendationsResponse, {
    'recommendations loaded': (r) => r.status === 200,
    'recommendations response time OK': (r) => r.timings.duration < 800,
  });
  
  responseTime.add(recommendationsResponse.timings.duration);
  requestCount.add(1);
  
  if (recommendationsResponse.status !== 200) {
    errorRate.add(1);
  }
}

function createContent(headers) {
  // Create a new interview
  const interviewData = {
    title: `Load Test Interview ${Math.random().toString(36).substring(7)}`,
    description: 'This is a test interview created during load testing.',
    category: 'Technology',
    tags: ['test', 'load-testing'],
    duration: 30,
    difficulty_level: 'intermediate'
  };
  
  const createResponse = http.post(`${API_URL}/interviews`, JSON.stringify(interviewData), {
    headers,
    tags: { endpoint: 'api', operation: 'create_interview' }
  });
  
  check(createResponse, {
    'interview created': (r) => r.status === 201,
    'create response time OK': (r) => r.timings.duration < 1000,
  });
  
  responseTime.add(createResponse.timings.duration);
  requestCount.add(1);
  
  if (createResponse.status !== 201) {
    errorRate.add(1);
  }
}

function aiAnalysisOperations(headers) {
  // Get a random interview for analysis
  const listResponse = http.get(`${API_URL}/interviews?page=1&limit=5`, {
    headers,
    tags: { endpoint: 'api', operation: 'list_for_analysis' }
  });
  
  if (listResponse.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  const interviews = JSON.parse(listResponse.body).interviews;
  if (!interviews || interviews.length === 0) {
    return;
  }
  
  const randomInterview = interviews[Math.floor(Math.random() * interviews.length)];
  
  // Start analysis (this might be a heavy operation)
  const analysisResponse = http.post(`${API_URL}/interviews/${randomInterview.id}/analyze`, null, {
    headers,
    tags: { endpoint: 'analysis', operation: 'start_analysis' }
  });
  
  check(analysisResponse, {
    'analysis started': (r) => r.status === 202 || r.status === 409, // 409 if already processing
    'analysis start response time OK': (r) => r.timings.duration < 2000,
  });
  
  responseTime.add(analysisResponse.timings.duration);
  requestCount.add(1);
  
  if (analysisResponse.status !== 202 && analysisResponse.status !== 409) {
    errorRate.add(1);
  }
}

// Custom summary report
export function handleSummary(data) {
  return {
    'tests/performance/results/load-test-report.html': htmlReport(data),
    'tests/performance/results/load-test-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting load test setup...');
  
  // Health check
  const healthResponse = http.get(`${API_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('API health check failed');
  }
  
  console.log('Load test setup completed successfully');
  return { timestamp: new Date().toISOString() };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log(`Load test completed at ${new Date().toISOString()}`);
  console.log(`Test started at ${data.timestamp}`);
}
