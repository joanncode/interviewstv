import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

/**
 * Stress Testing Configuration for Interviews.tv
 * Tests system behavior under extreme load conditions
 */

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');
const activeUsers = new Gauge('active_users');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUsage = new Gauge('cpu_usage_percent');

// Stress test configuration
export const options = {
  scenarios: {
    // Spike test - sudden load increase
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 10 },   // Normal load
        { duration: '30s', target: 200 }, // Spike to 200 req/s
        { duration: '1m', target: 200 },  // Stay at spike
        { duration: '30s', target: 10 },  // Drop back to normal
        { duration: '2m', target: 10 },   // Recovery period
      ],
      tags: { test_type: 'spike' },
    },
    
    // Breakpoint test - find system limits
    breakpoint_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '5m', target: 50 },   // Ramp to 50 req/s
        { duration: '5m', target: 100 },  // Ramp to 100 req/s
        { duration: '5m', target: 200 },  // Ramp to 200 req/s
        { duration: '5m', target: 400 },  // Ramp to 400 req/s
        { duration: '5m', target: 800 },  // Ramp to 800 req/s
        { duration: '10m', target: 800 }, // Sustain high load
      ],
      tags: { test_type: 'breakpoint' },
    },
    
    // Soak test - prolonged load
    soak_test: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      tags: { test_type: 'soak' },
    },
    
    // Volume test - large data processing
    volume_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      tags: { test_type: 'volume' },
    }
  },
  
  thresholds: {
    // System should handle stress gracefully
    http_req_duration: [
      'p(95)<2000',  // 95% of requests under 2s during stress
      'p(99)<5000'   // 99% of requests under 5s during stress
    ],
    http_req_failed: ['rate<0.05'], // Error rate under 5% during stress
    error_rate: ['rate<0.05'],
    
    // Scenario-specific thresholds
    'http_req_duration{test_type:spike}': ['p(95)<3000'],
    'http_req_duration{test_type:breakpoint}': ['p(95)<5000'],
    'http_req_duration{test_type:soak}': ['p(95)<1500'],
    'http_req_duration{test_type:volume}': ['p(95)<2000'],
    
    'http_req_failed{test_type:spike}': ['rate<0.1'],
    'http_req_failed{test_type:breakpoint}': ['rate<0.2'],
    'http_req_failed{test_type:soak}': ['rate<0.02'],
    'http_req_failed{test_type:volume}': ['rate<0.05'],
  },
  
  // Don't abort on threshold failures during stress testing
  noConnectionReuse: true,
  userAgent: 'K6StressTest/1.0',
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8000/api';
const STRESS_LEVEL = __ENV.STRESS_LEVEL || 'medium'; // low, medium, high, extreme

// Test data pools
const testUsers = generateTestUsers(100);
const searchQueries = generateSearchQueries(50);
const interviewData = generateInterviewData(20);

// Stress test scenarios
export default function() {
  const scenario = __ENV.K6_SCENARIO_NAME || 'spike_test';
  activeUsers.add(1);
  
  try {
    switch (scenario) {
      case 'spike_test':
        spikeTestScenario();
        break;
      case 'breakpoint_test':
        breakpointTestScenario();
        break;
      case 'soak_test':
        soakTestScenario();
        break;
      case 'volume_test':
        volumeTestScenario();
        break;
      default:
        mixedStressScenario();
    }
  } catch (error) {
    console.error(`Stress test error: ${error.message}`);
    errorRate.add(1);
  } finally {
    activeUsers.add(-1);
  }
  
  // Variable sleep based on stress level
  const sleepTime = getSleepTime();
  sleep(sleepTime);
}

function spikeTestScenario() {
  // Simulate sudden user behavior during traffic spikes
  const actions = [
    () => rapidBrowsing(),
    () => intensiveSearch(),
    () => concurrentVideoViewing(),
    () => rapidUserActions()
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  action();
}

function breakpointTestScenario() {
  // Push system to its limits
  const heavyActions = [
    () => massiveDataRetrieval(),
    () => complexSearchOperations(),
    () => heavyAnalysisRequests(),
    () => bulkOperations()
  ];
  
  const action = heavyActions[Math.floor(Math.random() * heavyActions.length)];
  action();
}

function soakTestScenario() {
  // Sustained normal operations over long period
  const normalActions = [
    () => regularBrowsing(),
    () => standardSearch(),
    () => normalVideoViewing(),
    () => typicalUserFlow()
  ];
  
  const action = normalActions[Math.floor(Math.random() * normalActions.length)];
  action();
}

function volumeTestScenario() {
  // Large data volume operations
  const volumeActions = [
    () => bulkDataUpload(),
    () => massiveSearch(),
    () => largeFileOperations(),
    () => batchProcessing()
  ];
  
  const action = volumeActions[Math.floor(Math.random() * volumeActions.length)];
  action();
}

function mixedStressScenario() {
  // Random mix of all stress scenarios
  const allActions = [
    () => rapidBrowsing(),
    () => massiveDataRetrieval(),
    () => regularBrowsing(),
    () => bulkDataUpload()
  ];
  
  const action = allActions[Math.floor(Math.random() * allActions.length)];
  action();
}

// Stress test action implementations
function rapidBrowsing() {
  // Rapid page navigation
  const pages = ['/interviews', '/search', '/dashboard', '/profile'];
  
  for (let i = 0; i < 5; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    const response = http.get(`${BASE_URL}${page}`, {
      tags: { action: 'rapid_browsing', page: page }
    });
    
    check(response, {
      'rapid browsing page loaded': (r) => r.status === 200,
      'rapid browsing response time acceptable': (r) => r.timings.duration < 3000
    });
    
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 200) {
      errorRate.add(1);
    }
    
    sleep(0.1); // Very short sleep between requests
  }
}

function intensiveSearch() {
  // Multiple concurrent searches
  const queries = searchQueries.slice(0, 10);
  
  queries.forEach(query => {
    const response = http.get(`${API_URL}/search?q=${encodeURIComponent(query)}&limit=50`, {
      tags: { action: 'intensive_search', query_length: query.length }
    });
    
    check(response, {
      'intensive search completed': (r) => r.status === 200,
      'intensive search response time acceptable': (r) => r.timings.duration < 5000
    });
    
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 200) {
      errorRate.add(1);
    }
  });
}

function concurrentVideoViewing() {
  // Simulate multiple video streams
  for (let i = 0; i < 3; i++) {
    const interviewId = Math.floor(Math.random() * 100) + 1;
    
    // Get video metadata
    const metaResponse = http.get(`${API_URL}/interviews/${interviewId}`, {
      tags: { action: 'video_viewing', type: 'metadata' }
    });
    
    // Simulate video chunk requests
    if (metaResponse.status === 200) {
      for (let chunk = 0; chunk < 5; chunk++) {
        const chunkResponse = http.get(`${API_URL}/interviews/${interviewId}/video/chunk/${chunk}`, {
          tags: { action: 'video_viewing', type: 'chunk' }
        });
        
        responseTime.add(chunkResponse.timings.duration);
        requestCount.add(1);
        
        if (chunkResponse.status !== 200 && chunkResponse.status !== 206) {
          errorRate.add(1);
        }
      }
    }
  }
}

function massiveDataRetrieval() {
  // Request large datasets
  const endpoints = [
    '/interviews?limit=100&page=1',
    '/search?q=javascript&limit=100',
    '/users?limit=100',
    '/analytics/dashboard'
  ];
  
  endpoints.forEach(endpoint => {
    const response = http.get(`${API_URL}${endpoint}`, {
      tags: { action: 'massive_data', endpoint: endpoint }
    });
    
    check(response, {
      'massive data retrieved': (r) => r.status === 200,
      'massive data response time acceptable': (r) => r.timings.duration < 10000
    });
    
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 200) {
      errorRate.add(1);
    }
  });
}

function heavyAnalysisRequests() {
  // Trigger AI analysis operations
  for (let i = 0; i < 3; i++) {
    const interviewId = Math.floor(Math.random() * 100) + 1;
    
    const response = http.post(`${API_URL}/interviews/${interviewId}/analyze`, null, {
      headers: { 'Content-Type': 'application/json' },
      tags: { action: 'heavy_analysis', interview_id: interviewId }
    });
    
    check(response, {
      'analysis request accepted': (r) => r.status === 202 || r.status === 409,
      'analysis response time acceptable': (r) => r.timings.duration < 5000
    });
    
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 202 && response.status !== 409) {
      errorRate.add(1);
    }
  }
}

function bulkDataUpload() {
  // Simulate large file uploads
  const largePayload = 'x'.repeat(1024 * 1024); // 1MB payload
  
  const response = http.post(`${API_URL}/interviews`, JSON.stringify({
    title: `Stress Test Interview ${Date.now()}`,
    description: largePayload,
    category: 'Technology',
    tags: ['stress-test', 'performance'],
    large_data: largePayload
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { action: 'bulk_upload', size: 'large' }
  });
  
  check(response, {
    'bulk upload completed': (r) => r.status === 201 || r.status === 413,
    'bulk upload response time acceptable': (r) => r.timings.duration < 15000
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 201 && response.status !== 413) {
    errorRate.add(1);
  }
}

// Helper functions
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `stresstest${i}@example.com`,
      password: 'StressTest123!'
    });
  }
  return users;
}

function generateSearchQueries(count) {
  const baseQueries = [
    'javascript', 'python', 'react', 'node.js', 'system design',
    'machine learning', 'data structures', 'algorithms', 'frontend',
    'backend', 'full stack', 'devops', 'cloud computing', 'microservices'
  ];
  
  const queries = [];
  for (let i = 0; i < count; i++) {
    const base = baseQueries[Math.floor(Math.random() * baseQueries.length)];
    const modifier = ['interview', 'tutorial', 'advanced', 'beginner', 'expert'][Math.floor(Math.random() * 5)];
    queries.push(`${base} ${modifier}`);
  }
  return queries;
}

function generateInterviewData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      title: `Stress Test Interview ${i}`,
      description: `This is a stress test interview number ${i}`,
      category: ['Technology', 'Business', 'Design'][Math.floor(Math.random() * 3)],
      tags: ['stress-test', 'performance', 'load-testing']
    });
  }
  return data;
}

function getSleepTime() {
  const sleepTimes = {
    low: Math.random() * 2 + 1,     // 1-3 seconds
    medium: Math.random() * 1 + 0.5, // 0.5-1.5 seconds
    high: Math.random() * 0.5 + 0.1, // 0.1-0.6 seconds
    extreme: Math.random() * 0.2      // 0-0.2 seconds
  };
  
  return sleepTimes[STRESS_LEVEL] || sleepTimes.medium;
}

// Regular action implementations (simplified versions)
function regularBrowsing() {
  const response = http.get(`${BASE_URL}/interviews`, {
    tags: { action: 'regular_browsing' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function standardSearch() {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const response = http.get(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
    tags: { action: 'standard_search' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function normalVideoViewing() {
  const interviewId = Math.floor(Math.random() * 100) + 1;
  const response = http.get(`${API_URL}/interviews/${interviewId}`, {
    tags: { action: 'normal_video_viewing' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function typicalUserFlow() {
  // Simulate typical user journey
  const actions = [
    () => http.get(`${BASE_URL}/`, { tags: { action: 'typical_flow', step: 'homepage' } }),
    () => http.get(`${BASE_URL}/interviews`, { tags: { action: 'typical_flow', step: 'browse' } }),
    () => http.get(`${API_URL}/search?q=javascript`, { tags: { action: 'typical_flow', step: 'search' } })
  ];
  
  actions.forEach((action, index) => {
    const response = action();
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 200) {
      errorRate.add(1);
    }
    
    sleep(0.5); // Brief pause between steps
  });
}

function massiveSearch() {
  // Search with very large result sets
  const response = http.get(`${API_URL}/search?q=*&limit=1000`, {
    tags: { action: 'massive_search' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function largeFileOperations() {
  // Simulate large file processing
  const response = http.get(`${API_URL}/interviews/export?format=full`, {
    tags: { action: 'large_file_ops' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function batchProcessing() {
  // Batch operations
  const batchData = Array(50).fill().map((_, i) => ({
    id: i,
    action: 'process'
  }));
  
  const response = http.post(`${API_URL}/batch/process`, JSON.stringify(batchData), {
    headers: { 'Content-Type': 'application/json' },
    tags: { action: 'batch_processing' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200 && response.status !== 202) {
    errorRate.add(1);
  }
}

function rapidUserActions() {
  // Rapid user interactions
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${API_URL}/user/activity`, {
      tags: { action: 'rapid_user_actions', iteration: i }
    });
    
    responseTime.add(response.timings.duration);
    requestCount.add(1);
    
    if (response.status !== 200) {
      errorRate.add(1);
    }
    
    sleep(0.05); // Very rapid requests
  }
}

function complexSearchOperations() {
  // Complex search with multiple filters
  const response = http.get(`${API_URL}/search?q=javascript&category=Technology&difficulty=advanced&sort=relevance&filters=video,analysis&limit=100`, {
    tags: { action: 'complex_search' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function bulkOperations() {
  // Bulk database operations
  const response = http.post(`${API_URL}/bulk/update`, JSON.stringify({
    operations: Array(100).fill().map((_, i) => ({
      type: 'update',
      id: i,
      data: { updated: true }
    }))
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { action: 'bulk_operations' }
  });
  
  responseTime.add(response.timings.duration);
  requestCount.add(1);
  
  if (response.status !== 200 && response.status !== 202) {
    errorRate.add(1);
  }
}

// Custom summary report
export function handleSummary(data) {
  return {
    'tests/performance/results/stress-test-report.html': htmlReport(data),
    'tests/performance/results/stress-test-summary.json': JSON.stringify(data),
    stdout: generateStressTestSummary(data),
  };
}

function generateStressTestSummary(data) {
  const scenarios = Object.keys(data.metrics.scenarios || {});
  let summary = '\n🔥 STRESS TEST RESULTS 🔥\n';
  summary += '================================\n\n';
  
  scenarios.forEach(scenario => {
    const scenarioData = data.metrics.scenarios[scenario];
    summary += `📊 ${scenario.toUpperCase()}:\n`;
    summary += `   Requests: ${scenarioData.http_reqs?.count || 0}\n`;
    summary += `   Failures: ${scenarioData.http_req_failed?.count || 0}\n`;
    summary += `   Avg Response: ${Math.round(scenarioData.http_req_duration?.avg || 0)}ms\n`;
    summary += `   P95 Response: ${Math.round(scenarioData.http_req_duration?.p95 || 0)}ms\n\n`;
  });
  
  const overallErrorRate = (data.metrics.http_req_failed?.rate || 0) * 100;
  summary += `🎯 Overall Error Rate: ${overallErrorRate.toFixed(2)}%\n`;
  summary += `⚡ Peak RPS: ${Math.round(data.metrics.http_reqs?.rate || 0)}\n`;
  summary += `🕐 Test Duration: ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s\n\n`;
  
  if (overallErrorRate < 5) {
    summary += '✅ STRESS TEST PASSED - System handled stress well!\n';
  } else if (overallErrorRate < 10) {
    summary += '⚠️  STRESS TEST WARNING - Some degradation under stress\n';
  } else {
    summary += '❌ STRESS TEST FAILED - Significant issues under stress\n';
  }
  
  return summary;
}
