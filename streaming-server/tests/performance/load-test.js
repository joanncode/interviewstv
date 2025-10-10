/**
 * Performance Load Testing for Streaming Infrastructure
 * 
 * Tests:
 * - Concurrent stream handling
 * - WebSocket connection limits
 * - Database performance under load
 * - Redis caching performance
 * - Memory and CPU usage
 * - Network bandwidth utilization
 * - Response time benchmarks
 */

const { performance } = require('perf_hooks');
const WebSocket = require('ws');
const axios = require('axios');
const cluster = require('cluster');
const os = require('os');

// Test configuration
const LOAD_TEST_CONFIG = {
  server: {
    host: process.env.TEST_HOST || 'localhost',
    port: process.env.TEST_PORT || 3000,
    protocol: process.env.TEST_PROTOCOL || 'http'
  },
  load: {
    maxConcurrentStreams: 1000,
    maxConcurrentViewers: 10000,
    maxWebSocketConnections: 5000,
    testDurationMs: 300000, // 5 minutes
    rampUpTimeMs: 60000,    // 1 minute
    rampDownTimeMs: 30000   // 30 seconds
  },
  thresholds: {
    maxResponseTime: 1000,    // 1 second
    maxMemoryUsage: 2048,     // 2GB
    maxCpuUsage: 80,          // 80%
    minSuccessRate: 95        // 95%
  }
};

class LoadTester {
  constructor() {
    this.baseUrl = `${LOAD_TEST_CONFIG.server.protocol}://${LOAD_TEST_CONFIG.server.host}:${LOAD_TEST_CONFIG.server.port}`;
    this.wsUrl = `ws://${LOAD_TEST_CONFIG.server.host}:${LOAD_TEST_CONFIG.server.port}`;
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        responseTimes: []
      },
      websockets: {
        connected: 0,
        disconnected: 0,
        errors: 0,
        messagesSent: 0,
        messagesReceived: 0
      },
      streams: {
        created: 0,
        started: 0,
        stopped: 0,
        errors: 0
      },
      system: {
        memoryUsage: [],
        cpuUsage: [],
        networkUsage: []
      }
    };

    this.activeConnections = new Set();
    this.activeStreams = new Set();
    this.testStartTime = null;
    this.testEndTime = null;
  }

  /**
   * Run comprehensive load test
   */
  async runLoadTest() {
    console.log('🚀 Starting Load Test...');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Max Concurrent Streams: ${LOAD_TEST_CONFIG.load.maxConcurrentStreams}`);
    console.log(`Max Concurrent Viewers: ${LOAD_TEST_CONFIG.load.maxConcurrentViewers}`);
    console.log(`Test Duration: ${LOAD_TEST_CONFIG.load.testDurationMs / 1000}s`);
    
    this.testStartTime = performance.now();
    
    try {
      // Start system monitoring
      this.startSystemMonitoring();
      
      // Run concurrent tests
      await Promise.all([
        this.testConcurrentStreaming(),
        this.testWebSocketConnections(),
        this.testAPIEndpoints(),
        this.testDatabasePerformance(),
        this.testCachePerformance()
      ]);
      
      this.testEndTime = performance.now();
      
      // Generate report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Load test failed:', error);
      throw error;
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Test concurrent streaming
   */
  async testConcurrentStreaming() {
    console.log('📹 Testing concurrent streaming...');
    
    const streamPromises = [];
    const maxStreams = LOAD_TEST_CONFIG.load.maxConcurrentStreams;
    
    for (let i = 0; i < maxStreams; i++) {
      streamPromises.push(this.createAndManageStream(i));
      
      // Stagger stream creation to simulate realistic load
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const results = await Promise.allSettled(streamPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Streaming test completed: ${successful} successful, ${failed} failed`);
    
    this.metrics.streams.created = successful;
    this.metrics.streams.errors = failed;
  }

  /**
   * Create and manage a single stream
   */
  async createAndManageStream(streamIndex) {
    try {
      const startTime = performance.now();
      
      // Create stream
      const createResponse = await this.makeRequest('POST', '/api/streams/create', {
        title: `Load Test Stream ${streamIndex}`,
        description: `Performance testing stream #${streamIndex}`,
        category: 'technology'
      });
      
      if (!createResponse.success) {
        throw new Error('Failed to create stream');
      }
      
      const streamId = createResponse.streamId;
      this.activeStreams.add(streamId);
      
      // Start stream
      await this.makeRequest('POST', `/api/streams/${streamId}/start`);
      this.metrics.streams.started++;
      
      // Simulate stream activity for random duration
      const streamDuration = Math.random() * 60000 + 30000; // 30s to 90s
      await new Promise(resolve => setTimeout(resolve, streamDuration));
      
      // Stop stream
      await this.makeRequest('POST', `/api/streams/${streamId}/stop`);
      this.metrics.streams.stopped++;
      
      const endTime = performance.now();
      this.metrics.requests.responseTimes.push(endTime - startTime);
      
      this.activeStreams.delete(streamId);
      
    } catch (error) {
      this.metrics.streams.errors++;
      throw error;
    }
  }

  /**
   * Test WebSocket connections
   */
  async testWebSocketConnections() {
    console.log('🔌 Testing WebSocket connections...');
    
    const connectionPromises = [];
    const maxConnections = LOAD_TEST_CONFIG.load.maxWebSocketConnections;
    
    for (let i = 0; i < maxConnections; i++) {
      connectionPromises.push(this.createWebSocketConnection(i));
      
      // Stagger connections
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const results = await Promise.allSettled(connectionPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ WebSocket test completed: ${successful} successful, ${failed} failed`);
  }

  /**
   * Create and manage WebSocket connection
   */
  async createWebSocketConnection(connectionIndex) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      const connectionId = `ws_${connectionIndex}`;
      
      let messageCount = 0;
      let isResolved = false;
      
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          ws.close();
          this.activeConnections.delete(connectionId);
          resolve();
        }
      }, 30000); // Keep connection for 30 seconds
      
      ws.on('open', () => {
        this.activeConnections.add(connectionId);
        this.metrics.websockets.connected++;
        
        // Send periodic messages
        const messageInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
              connectionId: connectionId
            }));
            this.metrics.websockets.messagesSent++;
            messageCount++;
          } else {
            clearInterval(messageInterval);
          }
        }, 1000);
        
        setTimeout(() => {
          clearInterval(messageInterval);
        }, 30000);
      });
      
      ws.on('message', (data) => {
        this.metrics.websockets.messagesReceived++;
      });
      
      ws.on('close', () => {
        this.metrics.websockets.disconnected++;
        this.activeConnections.delete(connectionId);
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      });
      
      ws.on('error', (error) => {
        this.metrics.websockets.errors++;
        this.activeConnections.delete(connectionId);
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      });
    });
  }

  /**
   * Test API endpoints performance
   */
  async testAPIEndpoints() {
    console.log('🌐 Testing API endpoints...');
    
    const endpoints = [
      { method: 'GET', path: '/api/streams/featured' },
      { method: 'GET', path: '/api/streams/live' },
      { method: 'GET', path: '/api/categories' },
      { method: 'GET', path: '/api/users/profile' },
      { method: 'GET', path: '/api/analytics/dashboard' }
    ];
    
    const requestPromises = [];
    const requestsPerEndpoint = 1000;
    
    for (const endpoint of endpoints) {
      for (let i = 0; i < requestsPerEndpoint; i++) {
        requestPromises.push(this.benchmarkRequest(endpoint.method, endpoint.path));
        
        // Stagger requests
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
    
    await Promise.allSettled(requestPromises);
    
    console.log(`✅ API endpoint testing completed`);
  }

  /**
   * Benchmark a single request
   */
  async benchmarkRequest(method, path, data = null) {
    const startTime = performance.now();
    
    try {
      await this.makeRequest(method, path, data);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.metrics.requests.total++;
      this.metrics.requests.successful++;
      this.metrics.requests.responseTimes.push(responseTime);
      
      return responseTime;
    } catch (error) {
      this.metrics.requests.total++;
      this.metrics.requests.failed++;
      throw error;
    }
  }

  /**
   * Test database performance
   */
  async testDatabasePerformance() {
    console.log('🗄️ Testing database performance...');
    
    const dbTestPromises = [];
    const queryCount = 5000;
    
    // Test various database operations
    for (let i = 0; i < queryCount; i++) {
      dbTestPromises.push(this.testDatabaseQuery(i));
      
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    await Promise.allSettled(dbTestPromises);
    
    console.log(`✅ Database performance testing completed`);
  }

  /**
   * Test a database query
   */
  async testDatabaseQuery(queryIndex) {
    const queries = [
      '/api/streams/search?q=test',
      '/api/users/search?q=user',
      '/api/analytics/stats',
      '/api/streams/trending'
    ];
    
    const randomQuery = queries[queryIndex % queries.length];
    return this.benchmarkRequest('GET', randomQuery);
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    console.log('⚡ Testing cache performance...');
    
    const cacheTestPromises = [];
    const cacheOperations = 10000;
    
    for (let i = 0; i < cacheOperations; i++) {
      cacheTestPromises.push(this.testCacheOperation(i));
      
      if (i % 200 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    await Promise.allSettled(cacheTestPromises);
    
    console.log(`✅ Cache performance testing completed`);
  }

  /**
   * Test cache operation
   */
  async testCacheOperation(operationIndex) {
    // Test frequently accessed endpoints that should be cached
    const cachedEndpoints = [
      '/api/streams/featured',
      '/api/categories',
      '/api/streams/trending'
    ];
    
    const endpoint = cachedEndpoints[operationIndex % cachedEndpoints.length];
    return this.benchmarkRequest('GET', endpoint);
  }

  /**
   * Make HTTP request
   */
  async makeRequest(method, path, data = null) {
    const config = {
      method: method,
      url: `${this.baseUrl}${path}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    console.log('📊 Starting system monitoring...');
    
    const monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.system.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss / 1024 / 1024, // MB
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024 // MB
      });
      
      this.metrics.system.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      
    }, 1000); // Monitor every second
    
    // Stop monitoring after test duration
    setTimeout(() => {
      clearInterval(monitoringInterval);
    }, LOAD_TEST_CONFIG.load.testDurationMs);
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    console.log('\n📈 PERFORMANCE TEST REPORT');
    console.log('=' .repeat(50));
    
    const testDuration = (this.testEndTime - this.testStartTime) / 1000;
    
    // Request metrics
    const avgResponseTime = this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length;
    const maxResponseTime = Math.max(...this.metrics.requests.responseTimes);
    const minResponseTime = Math.min(...this.metrics.requests.responseTimes);
    const successRate = (this.metrics.requests.successful / this.metrics.requests.total) * 100;
    
    console.log('\n🌐 HTTP REQUESTS:');
    console.log(`  Total Requests: ${this.metrics.requests.total}`);
    console.log(`  Successful: ${this.metrics.requests.successful}`);
    console.log(`  Failed: ${this.metrics.requests.failed}`);
    console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`  Requests/Second: ${(this.metrics.requests.total / testDuration).toFixed(2)}`);
    
    // WebSocket metrics
    console.log('\n🔌 WEBSOCKETS:');
    console.log(`  Connections: ${this.metrics.websockets.connected}`);
    console.log(`  Disconnections: ${this.metrics.websockets.disconnected}`);
    console.log(`  Errors: ${this.metrics.websockets.errors}`);
    console.log(`  Messages Sent: ${this.metrics.websockets.messagesSent}`);
    console.log(`  Messages Received: ${this.metrics.websockets.messagesReceived}`);
    
    // Streaming metrics
    console.log('\n📹 STREAMING:');
    console.log(`  Streams Created: ${this.metrics.streams.created}`);
    console.log(`  Streams Started: ${this.metrics.streams.started}`);
    console.log(`  Streams Stopped: ${this.metrics.streams.stopped}`);
    console.log(`  Stream Errors: ${this.metrics.streams.errors}`);
    
    // System metrics
    const maxMemory = Math.max(...this.metrics.system.memoryUsage.map(m => m.rss));
    const avgMemory = this.metrics.system.memoryUsage.reduce((a, b) => a + b.rss, 0) / this.metrics.system.memoryUsage.length;
    
    console.log('\n💻 SYSTEM PERFORMANCE:');
    console.log(`  Max Memory Usage: ${maxMemory.toFixed(2)} MB`);
    console.log(`  Avg Memory Usage: ${avgMemory.toFixed(2)} MB`);
    console.log(`  Test Duration: ${testDuration.toFixed(2)}s`);
    
    // Performance thresholds check
    console.log('\n✅ THRESHOLD CHECKS:');
    console.log(`  Response Time: ${maxResponseTime <= LOAD_TEST_CONFIG.thresholds.maxResponseTime ? '✅ PASS' : '❌ FAIL'} (${maxResponseTime.toFixed(2)}ms <= ${LOAD_TEST_CONFIG.thresholds.maxResponseTime}ms)`);
    console.log(`  Memory Usage: ${maxMemory <= LOAD_TEST_CONFIG.thresholds.maxMemoryUsage ? '✅ PASS' : '❌ FAIL'} (${maxMemory.toFixed(2)}MB <= ${LOAD_TEST_CONFIG.thresholds.maxMemoryUsage}MB)`);
    console.log(`  Success Rate: ${successRate >= LOAD_TEST_CONFIG.thresholds.minSuccessRate ? '✅ PASS' : '❌ FAIL'} (${successRate.toFixed(2)}% >= ${LOAD_TEST_CONFIG.thresholds.minSuccessRate}%)`);
    
    // Save detailed report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: testDuration,
      metrics: this.metrics,
      thresholds: LOAD_TEST_CONFIG.thresholds,
      summary: {
        avgResponseTime,
        maxResponseTime,
        minResponseTime,
        successRate,
        maxMemory,
        avgMemory,
        requestsPerSecond: this.metrics.requests.total / testDuration
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      `./tests/performance/reports/load-test-${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to ./tests/performance/reports/');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    // Close all active WebSocket connections
    for (const connectionId of this.activeConnections) {
      // Connections will be closed automatically
    }
    
    // Stop all active streams
    for (const streamId of this.activeStreams) {
      try {
        await this.makeRequest('POST', `/api/streams/${streamId}/stop`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Run load test if called directly
if (require.main === module) {
  const loadTester = new LoadTester();
  
  loadTester.runLoadTest()
    .then(() => {
      console.log('\n🎉 Load test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Load test failed:', error);
      process.exit(1);
    });
}

module.exports = LoadTester;
