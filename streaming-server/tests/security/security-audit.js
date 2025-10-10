/**
 * Security Audit and Penetration Testing Suite
 * 
 * Tests:
 * - Authentication and authorization vulnerabilities
 * - SQL injection and XSS attacks
 * - CSRF protection
 * - Rate limiting effectiveness
 * - Input validation and sanitization
 * - Session management security
 * - API security vulnerabilities
 * - WebSocket security
 * - File upload security
 * - Data encryption validation
 */

const { describe, it, beforeAll, afterAll, expect } = require('@jest/globals');
const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Security test configuration
const SECURITY_CONFIG = {
  server: {
    host: process.env.TEST_HOST || 'localhost',
    port: process.env.TEST_PORT || 3000,
    protocol: process.env.TEST_PROTOCOL || 'http'
  },
  payloads: {
    sqlInjection: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#"
    ],
    xss: [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
      "';alert('XSS');//",
      "<iframe src=javascript:alert('XSS')></iframe>"
    ],
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "..%252f..%252f..%252fetc%252fpasswd"
    ],
    commandInjection: [
      "; ls -la",
      "| cat /etc/passwd",
      "&& whoami",
      "`id`",
      "$(whoami)",
      "; rm -rf /"
    ]
  }
};

class SecurityAuditor {
  constructor() {
    this.baseUrl = `${SECURITY_CONFIG.server.protocol}://${SECURITY_CONFIG.server.host}:${SECURITY_CONFIG.server.port}`;
    this.wsUrl = `ws://${SECURITY_CONFIG.server.host}:${SECURITY_CONFIG.server.port}`;
    
    this.vulnerabilities = [];
    this.testResults = {
      authentication: [],
      authorization: [],
      injection: [],
      xss: [],
      csrf: [],
      rateLimiting: [],
      inputValidation: [],
      sessionManagement: [],
      encryption: [],
      fileUpload: [],
      websocket: []
    };
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit() {
    console.log('🔒 Starting Security Audit...');
    console.log(`Target: ${this.baseUrl}`);
    
    try {
      // Run all security tests
      await this.testAuthentication();
      await this.testAuthorization();
      await this.testSQLInjection();
      await this.testXSSVulnerabilities();
      await this.testCSRFProtection();
      await this.testRateLimiting();
      await this.testInputValidation();
      await this.testSessionManagement();
      await this.testEncryption();
      await this.testFileUploadSecurity();
      await this.testWebSocketSecurity();
      
      // Generate security report
      this.generateSecurityReport();
      
    } catch (error) {
      console.error('❌ Security audit failed:', error);
      throw error;
    }
  }

  /**
   * Test authentication vulnerabilities
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication security...');
    
    const tests = [
      this.testWeakPasswords(),
      this.testBruteForceProtection(),
      this.testPasswordResetSecurity(),
      this.testJWTSecurity(),
      this.testMFABypass()
    ];
    
    const results = await Promise.allSettled(tests);
    this.testResults.authentication = results;
    
    console.log('✅ Authentication tests completed');
  }

  /**
   * Test weak password acceptance
   */
  async testWeakPasswords() {
    const weakPasswords = [
      '123456',
      'password',
      'admin',
      'qwerty',
      '12345678',
      'abc123'
    ];
    
    for (const password of weakPasswords) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          username: `test_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: password,
          firstName: 'Test',
          lastName: 'User'
        });
        
        if (response.status === 201) {
          this.addVulnerability('WEAK_PASSWORD', `Weak password accepted: ${password}`, 'HIGH');
        }
      } catch (error) {
        // Expected to fail - good security
      }
    }
  }

  /**
   * Test brute force protection
   */
  async testBruteForceProtection() {
    const testEmail = 'bruteforce@test.com';
    const attempts = 20;
    let successfulAttempts = 0;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: testEmail,
          password: `wrong_password_${i}`
        });
        
        if (response.status === 200) {
          successfulAttempts++;
        }
      } catch (error) {
        // Expected to fail
      }
    }
    
    if (successfulAttempts > 5) {
      this.addVulnerability('BRUTE_FORCE', 'No brute force protection detected', 'HIGH');
    }
  }

  /**
   * Test JWT security
   */
  async testJWTSecurity() {
    try {
      // Test with malformed JWT
      const malformedTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'null',
        'undefined'
      ];
      
      for (const token of malformedTokens) {
        try {
          const response = await axios.get(`${this.baseUrl}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.status === 200) {
            this.addVulnerability('JWT_BYPASS', `Invalid JWT accepted: ${token}`, 'CRITICAL');
          }
        } catch (error) {
          // Expected to fail - good security
        }
      }
    } catch (error) {
      console.error('JWT test error:', error.message);
    }
  }

  /**
   * Test SQL injection vulnerabilities
   */
  async testSQLInjection() {
    console.log('💉 Testing SQL injection vulnerabilities...');
    
    const endpoints = [
      '/api/streams/search',
      '/api/users/search',
      '/api/streams',
      '/api/categories'
    ];
    
    for (const endpoint of endpoints) {
      for (const payload of SECURITY_CONFIG.payloads.sqlInjection) {
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            params: { q: payload }
          });
          
          // Check for SQL error messages in response
          const responseText = JSON.stringify(response.data).toLowerCase();
          const sqlErrors = [
            'sql syntax',
            'mysql_fetch',
            'ora-',
            'postgresql',
            'sqlite_',
            'sqlstate'
          ];
          
          if (sqlErrors.some(error => responseText.includes(error))) {
            this.addVulnerability('SQL_INJECTION', `SQL injection possible at ${endpoint} with payload: ${payload}`, 'CRITICAL');
          }
        } catch (error) {
          // Check error messages for SQL injection indicators
          if (error.response && error.response.data) {
            const errorText = JSON.stringify(error.response.data).toLowerCase();
            if (errorText.includes('sql') || errorText.includes('database')) {
              this.addVulnerability('SQL_INJECTION', `SQL error exposed at ${endpoint}`, 'HIGH');
            }
          }
        }
      }
    }
    
    console.log('✅ SQL injection tests completed');
  }

  /**
   * Test XSS vulnerabilities
   */
  async testXSSVulnerabilities() {
    console.log('🕷️ Testing XSS vulnerabilities...');
    
    const endpoints = [
      { method: 'POST', path: '/api/streams/create', field: 'title' },
      { method: 'POST', path: '/api/streams/create', field: 'description' },
      { method: 'POST', path: '/api/chat/message', field: 'message' },
      { method: 'PUT', path: '/api/user/profile', field: 'bio' }
    ];
    
    for (const endpoint of endpoints) {
      for (const payload of SECURITY_CONFIG.payloads.xss) {
        try {
          const data = {};
          data[endpoint.field] = payload;
          
          if (endpoint.path === '/api/streams/create') {
            data.category = 'technology';
          }
          
          const response = await axios({
            method: endpoint.method,
            url: `${this.baseUrl}${endpoint.path}`,
            data: data,
            headers: { 'Content-Type': 'application/json' }
          });
          
          // Check if XSS payload is reflected without encoding
          const responseText = JSON.stringify(response.data);
          if (responseText.includes(payload) && !responseText.includes('&lt;') && !responseText.includes('&gt;')) {
            this.addVulnerability('XSS', `XSS vulnerability at ${endpoint.path} in field ${endpoint.field}`, 'HIGH');
          }
        } catch (error) {
          // Expected to fail for malicious input
        }
      }
    }
    
    console.log('✅ XSS tests completed');
  }

  /**
   * Test CSRF protection
   */
  async testCSRFProtection() {
    console.log('🛡️ Testing CSRF protection...');
    
    try {
      // Test state-changing operations without CSRF token
      const stateChangingEndpoints = [
        { method: 'POST', path: '/api/streams/create' },
        { method: 'DELETE', path: '/api/streams/test123' },
        { method: 'PUT', path: '/api/user/profile' },
        { method: 'POST', path: '/api/auth/logout' }
      ];
      
      for (const endpoint of stateChangingEndpoints) {
        try {
          const response = await axios({
            method: endpoint.method,
            url: `${this.baseUrl}${endpoint.path}`,
            data: { test: 'csrf_test' },
            headers: {
              'Origin': 'http://malicious-site.com',
              'Referer': 'http://malicious-site.com'
            }
          });
          
          if (response.status < 400) {
            this.addVulnerability('CSRF', `CSRF protection missing for ${endpoint.method} ${endpoint.path}`, 'MEDIUM');
          }
        } catch (error) {
          // Expected to fail - good CSRF protection
        }
      }
    } catch (error) {
      console.error('CSRF test error:', error.message);
    }
    
    console.log('✅ CSRF tests completed');
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing rate limiting...');
    
    const endpoints = [
      '/api/auth/login',
      '/api/streams/create',
      '/api/chat/message'
    ];
    
    for (const endpoint of endpoints) {
      let successCount = 0;
      const requestCount = 100;
      
      const promises = Array.from({ length: requestCount }, async () => {
        try {
          const response = await axios.post(`${this.baseUrl}${endpoint}`, {
            test: 'rate_limit_test'
          });
          
          if (response.status < 400) {
            successCount++;
          }
        } catch (error) {
          // Expected to be rate limited
        }
      });
      
      await Promise.allSettled(promises);
      
      if (successCount > 50) {
        this.addVulnerability('RATE_LIMITING', `Insufficient rate limiting on ${endpoint}`, 'MEDIUM');
      }
    }
    
    console.log('✅ Rate limiting tests completed');
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    console.log('✅ Testing input validation...');
    
    const invalidInputs = [
      { field: 'email', value: 'invalid-email' },
      { field: 'age', value: -1 },
      { field: 'age', value: 999 },
      { field: 'username', value: 'a' }, // Too short
      { field: 'username', value: 'a'.repeat(100) }, // Too long
      { field: 'title', value: '' }, // Empty required field
      { field: 'category', value: 'invalid_category' }
    ];
    
    for (const input of invalidInputs) {
      try {
        const data = { [input.field]: input.value };
        
        const response = await axios.post(`${this.baseUrl}/api/streams/create`, data);
        
        if (response.status === 201) {
          this.addVulnerability('INPUT_VALIDATION', `Invalid input accepted for ${input.field}: ${input.value}`, 'MEDIUM');
        }
      } catch (error) {
        // Expected to fail - good validation
      }
    }
    
    console.log('✅ Input validation tests completed');
  }

  /**
   * Test session management
   */
  async testSessionManagement() {
    console.log('🍪 Testing session management...');
    
    try {
      // Test session fixation
      const response1 = await axios.get(`${this.baseUrl}/api/auth/status`);
      const cookies1 = response1.headers['set-cookie'];
      
      // Login with fixed session
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'password'
      }, {
        headers: {
          Cookie: cookies1 ? cookies1.join('; ') : ''
        }
      });
      
      const cookies2 = loginResponse.headers['set-cookie'];
      
      if (cookies1 && cookies2 && cookies1[0] === cookies2[0]) {
        this.addVulnerability('SESSION_FIXATION', 'Session ID not regenerated after login', 'MEDIUM');
      }
    } catch (error) {
      // Test may fail due to authentication requirements
    }
    
    console.log('✅ Session management tests completed');
  }

  /**
   * Test encryption and data protection
   */
  async testEncryption() {
    console.log('🔐 Testing encryption and data protection...');
    
    try {
      // Test if sensitive data is transmitted over HTTP
      if (SECURITY_CONFIG.server.protocol === 'http') {
        this.addVulnerability('INSECURE_TRANSPORT', 'Sensitive data transmitted over HTTP', 'HIGH');
      }
      
      // Test password storage (attempt to retrieve hashed passwords)
      const response = await axios.get(`${this.baseUrl}/api/users/profile`);
      
      if (response.data && response.data.password) {
        this.addVulnerability('PASSWORD_EXPOSURE', 'Password hash exposed in API response', 'CRITICAL');
      }
    } catch (error) {
      // Expected to fail without authentication
    }
    
    console.log('✅ Encryption tests completed');
  }

  /**
   * Test file upload security
   */
  async testFileUploadSecurity() {
    console.log('📁 Testing file upload security...');
    
    try {
      // Test malicious file uploads
      const maliciousFiles = [
        { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
        { name: 'test.exe', content: 'MZ\x90\x00' }, // PE header
        { name: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
      ];
      
      for (const file of maliciousFiles) {
        try {
          const formData = new FormData();
          formData.append('file', new Blob([file.content]), file.name);
          
          const response = await axios.post(`${this.baseUrl}/api/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (response.status === 200) {
            this.addVulnerability('FILE_UPLOAD', `Malicious file upload accepted: ${file.name}`, 'HIGH');
          }
        } catch (error) {
          // Expected to fail - good file validation
        }
      }
    } catch (error) {
      console.error('File upload test error:', error.message);
    }
    
    console.log('✅ File upload tests completed');
  }

  /**
   * Test WebSocket security
   */
  async testWebSocketSecurity() {
    console.log('🔌 Testing WebSocket security...');
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(this.wsUrl);
        
        ws.on('open', () => {
          // Test unauthorized access
          ws.send(JSON.stringify({
            type: 'admin-command',
            command: 'delete-all-streams'
          }));
          
          // Test message injection
          ws.send(JSON.stringify({
            type: 'chat-message',
            message: '<script>alert("XSS")</script>'
          }));
          
          setTimeout(() => {
            ws.close();
            resolve();
          }, 1000);
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data);
          
          if (message.type === 'error' && message.message.includes('unauthorized')) {
            // Good - unauthorized access blocked
          } else if (message.type === 'admin-response') {
            this.addVulnerability('WEBSOCKET_AUTH', 'Unauthorized WebSocket command executed', 'HIGH');
          }
        });
        
        ws.on('error', () => {
          resolve();
        });
        
      } catch (error) {
        resolve();
      }
    });
  }

  /**
   * Add vulnerability to report
   */
  addVulnerability(type, description, severity) {
    this.vulnerabilities.push({
      type,
      description,
      severity,
      timestamp: new Date().toISOString()
    });
    
    console.log(`⚠️  ${severity}: ${description}`);
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    console.log('\n🔒 SECURITY AUDIT REPORT');
    console.log('=' .repeat(50));
    
    const severityCounts = {
      CRITICAL: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      HIGH: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
      MEDIUM: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
      LOW: this.vulnerabilities.filter(v => v.severity === 'LOW').length
    };
    
    console.log('\n📊 VULNERABILITY SUMMARY:');
    console.log(`  Critical: ${severityCounts.CRITICAL}`);
    console.log(`  High: ${severityCounts.HIGH}`);
    console.log(`  Medium: ${severityCounts.MEDIUM}`);
    console.log(`  Low: ${severityCounts.LOW}`);
    console.log(`  Total: ${this.vulnerabilities.length}`);
    
    if (this.vulnerabilities.length > 0) {
      console.log('\n🚨 VULNERABILITIES FOUND:');
      this.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
      });
    } else {
      console.log('\n✅ No vulnerabilities found!');
    }
    
    // Security score calculation
    const securityScore = Math.max(0, 100 - (
      severityCounts.CRITICAL * 25 +
      severityCounts.HIGH * 10 +
      severityCounts.MEDIUM * 5 +
      severityCounts.LOW * 1
    ));
    
    console.log(`\n🏆 SECURITY SCORE: ${securityScore}/100`);
    
    if (securityScore >= 90) {
      console.log('🟢 Excellent security posture');
    } else if (securityScore >= 70) {
      console.log('🟡 Good security with room for improvement');
    } else if (securityScore >= 50) {
      console.log('🟠 Moderate security concerns');
    } else {
      console.log('🔴 Significant security issues require immediate attention');
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      vulnerabilities: this.vulnerabilities,
      severityCounts,
      securityScore,
      testResults: this.testResults
    };
    
    const reportPath = `./tests/security/reports/security-audit-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n📄 Detailed report saved to ${reportPath}`);
  }
}

// Run security audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  
  auditor.runSecurityAudit()
    .then(() => {
      console.log('\n🎉 Security audit completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Security audit failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityAuditor;
