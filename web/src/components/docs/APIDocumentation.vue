<template>
  <div class="api-documentation">
    <!-- Header -->
    <div class="docs-header">
      <div class="header-content">
        <h1 class="docs-title">
          <i class="fas fa-code"></i>
          Interviews.tv API Documentation
        </h1>
        <p class="docs-subtitle">
          Comprehensive API for building applications with the Interviews.tv platform
        </p>
      </div>
      
      <div class="header-actions">
        <div class="api-version">
          <span class="version-label">Version</span>
          <span class="version-number">{{ apiSpec.info?.version || '1.0.0' }}</span>
        </div>
        <button @click="downloadSDK('javascript')" class="btn btn-primary">
          <i class="fab fa-js-square"></i>
          JavaScript SDK
        </button>
        <button @click="downloadSDK('python')" class="btn btn-outline">
          <i class="fab fa-python"></i>
          Python SDK
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="docs-nav">
      <div class="nav-section">
        <h3>Getting Started</h3>
        <ul>
          <li><a href="#introduction" @click="scrollTo('introduction')">Introduction</a></li>
          <li><a href="#authentication" @click="scrollTo('authentication')">Authentication</a></li>
          <li><a href="#rate-limiting" @click="scrollTo('rate-limiting')">Rate Limiting</a></li>
          <li><a href="#errors" @click="scrollTo('errors')">Error Handling</a></li>
        </ul>
      </div>
      
      <div class="nav-section">
        <h3>API Endpoints</h3>
        <ul>
          <li 
            v-for="(methods, path) in apiSpec.paths" 
            :key="path"
            class="endpoint-item"
          >
            <div class="endpoint-path">{{ path }}</div>
            <ul class="method-list">
              <li 
                v-for="(operation, method) in methods" 
                :key="method"
                @click="selectEndpoint(path, method)"
                :class="{ active: selectedEndpoint?.path === path && selectedEndpoint?.method === method }"
              >
                <span class="method-badge" :class="method">{{ method.toUpperCase() }}</span>
                <span class="operation-summary">{{ operation.summary }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
      
      <div class="nav-section">
        <h3>SDKs & Examples</h3>
        <ul>
          <li><a href="#javascript-sdk" @click="scrollTo('javascript-sdk')">JavaScript SDK</a></li>
          <li><a href="#python-sdk" @click="scrollTo('python-sdk')">Python SDK</a></li>
          <li><a href="#php-sdk" @click="scrollTo('php-sdk')">PHP SDK</a></li>
          <li><a href="#curl-examples" @click="scrollTo('curl-examples')">cURL Examples</a></li>
        </ul>
      </div>
    </div>

    <!-- Main Content -->
    <div class="docs-content">
      <!-- Introduction Section -->
      <section id="introduction" class="docs-section">
        <h2>Introduction</h2>
        <p>
          The Interviews.tv API provides programmatic access to our platform's features, 
          allowing you to build applications that integrate with our interview and business 
          networking ecosystem.
        </p>
        
        <div class="info-box">
          <h4>Base URL</h4>
          <code class="base-url">{{ apiSpec.servers?.[0]?.url || 'https://api.interviews.tv' }}</code>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <i class="fas fa-video"></i>
            <h4>Interview Management</h4>
            <p>Create, update, and manage interview content</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-users"></i>
            <h4>User Profiles</h4>
            <p>Access user profiles and social connections</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-building"></i>
            <h4>Business Directory</h4>
            <p>Explore and manage business listings</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-chart-bar"></i>
            <h4>Analytics</h4>
            <p>Retrieve engagement and performance metrics</p>
          </div>
        </div>
      </section>

      <!-- Authentication Section -->
      <section id="authentication" class="docs-section">
        <h2>Authentication</h2>
        <p>
          The Interviews.tv API uses JWT (JSON Web Tokens) for authentication. 
          Include your token in the Authorization header of your requests.
        </p>
        
        <div class="code-example">
          <div class="code-header">
            <span>Authorization Header</span>
            <button @click="copyToClipboard('auth-header')" class="copy-btn">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <pre id="auth-header"><code>Authorization: Bearer YOUR_JWT_TOKEN</code></pre>
        </div>

        <h3>Getting a Token</h3>
        <p>Obtain a JWT token by making a POST request to the login endpoint:</p>
        
        <div class="code-example">
          <div class="code-header">
            <span>Login Request</span>
            <button @click="copyToClipboard('login-example')" class="copy-btn">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <pre id="login-example"><code>curl -X POST {{ apiSpec.servers?.[0]?.url }}/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'</code></pre>
        </div>
      </section>

      <!-- Rate Limiting Section -->
      <section id="rate-limiting" class="docs-section">
        <h2>Rate Limiting</h2>
        <p>
          API requests are limited to prevent abuse and ensure fair usage. 
          Current limits are:
        </p>
        
        <div class="rate-limits">
          <div class="limit-item">
            <span class="limit-value">1,000</span>
            <span class="limit-label">requests per hour</span>
          </div>
          <div class="limit-item">
            <span class="limit-value">100</span>
            <span class="limit-label">requests per minute</span>
          </div>
        </div>

        <p>Rate limit information is included in response headers:</p>
        <ul>
          <li><code>X-RateLimit-Limit</code> - Request limit per hour</li>
          <li><code>X-RateLimit-Remaining</code> - Remaining requests in current window</li>
          <li><code>X-RateLimit-Reset</code> - Time when the rate limit resets</li>
        </ul>
      </section>

      <!-- Error Handling Section -->
      <section id="errors" class="docs-section">
        <h2>Error Handling</h2>
        <p>
          The API uses conventional HTTP response codes to indicate success or failure. 
          Error responses include a JSON object with error details.
        </p>
        
        <div class="error-codes">
          <div class="error-code">
            <span class="code">200</span>
            <span class="description">OK - Request successful</span>
          </div>
          <div class="error-code">
            <span class="code">400</span>
            <span class="description">Bad Request - Invalid request parameters</span>
          </div>
          <div class="error-code">
            <span class="code">401</span>
            <span class="description">Unauthorized - Invalid or missing authentication</span>
          </div>
          <div class="error-code">
            <span class="code">403</span>
            <span class="description">Forbidden - Insufficient permissions</span>
          </div>
          <div class="error-code">
            <span class="code">404</span>
            <span class="description">Not Found - Resource not found</span>
          </div>
          <div class="error-code">
            <span class="code">429</span>
            <span class="description">Too Many Requests - Rate limit exceeded</span>
          </div>
          <div class="error-code">
            <span class="code">500</span>
            <span class="description">Internal Server Error - Server error</span>
          </div>
        </div>

        <h3>Error Response Format</h3>
        <div class="code-example">
          <pre><code>{
  "error": "validation_failed",
  "message": "The request parameters are invalid",
  "code": 400,
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}</code></pre>
        </div>
      </section>

      <!-- Endpoint Details -->
      <section v-if="selectedEndpoint" class="docs-section endpoint-details">
        <h2>
          <span class="method-badge" :class="selectedEndpoint.method">
            {{ selectedEndpoint.method.toUpperCase() }}
          </span>
          {{ selectedEndpoint.path }}
        </h2>
        
        <p class="endpoint-description">
          {{ selectedEndpoint.operation.description || selectedEndpoint.operation.summary }}
        </p>

        <!-- Parameters -->
        <div v-if="selectedEndpoint.operation.parameters" class="parameters-section">
          <h3>Parameters</h3>
          <div class="parameters-table">
            <div class="table-header">
              <div class="col-name">Name</div>
              <div class="col-type">Type</div>
              <div class="col-location">Location</div>
              <div class="col-required">Required</div>
              <div class="col-description">Description</div>
            </div>
            <div 
              v-for="param in selectedEndpoint.operation.parameters" 
              :key="param.name"
              class="table-row"
            >
              <div class="col-name">
                <code>{{ param.name }}</code>
              </div>
              <div class="col-type">
                {{ param.schema?.type || 'string' }}
              </div>
              <div class="col-location">
                <span class="location-badge" :class="param.in">{{ param.in }}</span>
              </div>
              <div class="col-required">
                <span v-if="param.required" class="required-badge">Required</span>
                <span v-else class="optional-badge">Optional</span>
              </div>
              <div class="col-description">
                {{ param.description || '-' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Request Body -->
        <div v-if="selectedEndpoint.operation.requestBody" class="request-body-section">
          <h3>Request Body</h3>
          <div class="code-example">
            <div class="code-header">
              <span>JSON Schema</span>
              <button @click="copyToClipboard('request-schema')" class="copy-btn">
                <i class="fas fa-copy"></i>
              </button>
            </div>
            <pre id="request-schema"><code>{{ formatSchema(selectedEndpoint.operation.requestBody) }}</code></pre>
          </div>
        </div>

        <!-- Responses -->
        <div v-if="selectedEndpoint.operation.responses" class="responses-section">
          <h3>Responses</h3>
          <div 
            v-for="(response, statusCode) in selectedEndpoint.operation.responses" 
            :key="statusCode"
            class="response-item"
          >
            <div class="response-header">
              <span class="status-code" :class="getStatusClass(statusCode)">{{ statusCode }}</span>
              <span class="response-description">{{ response.description }}</span>
            </div>
            <div v-if="response.content" class="response-schema">
              <div class="code-example">
                <pre><code>{{ formatResponseSchema(response.content) }}</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Try It Out -->
        <div class="try-it-section">
          <h3>Try It Out</h3>
          <div class="api-tester">
            <div class="tester-form">
              <div v-if="selectedEndpoint.operation.parameters" class="form-section">
                <h4>Parameters</h4>
                <div 
                  v-for="param in selectedEndpoint.operation.parameters" 
                  :key="param.name"
                  class="form-group"
                >
                  <label>{{ param.name }}</label>
                  <input 
                    v-model="testParams[param.name]"
                    :type="getInputType(param.schema?.type)"
                    :placeholder="param.description"
                    :required="param.required"
                  />
                </div>
              </div>
              
              <div v-if="selectedEndpoint.operation.requestBody" class="form-section">
                <h4>Request Body</h4>
                <textarea 
                  v-model="testRequestBody"
                  placeholder="Enter JSON request body..."
                  rows="8"
                ></textarea>
              </div>
              
              <button @click="testEndpoint" class="btn btn-primary" :disabled="testing">
                <i v-if="testing" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-play"></i>
                {{ testing ? 'Testing...' : 'Send Request' }}
              </button>
            </div>
            
            <div v-if="testResponse" class="test-response">
              <h4>Response</h4>
              <div class="response-status" :class="getStatusClass(testResponse.status)">
                {{ testResponse.status }} {{ testResponse.statusText }}
              </div>
              <div class="response-body">
                <pre><code>{{ JSON.stringify(testResponse.data, null, 2) }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SDK Sections -->
      <section id="javascript-sdk" class="docs-section">
        <h2>JavaScript SDK</h2>
        <p>Install and use our JavaScript SDK for easy integration:</p>
        
        <div class="code-example">
          <div class="code-header">
            <span>Installation</span>
            <button @click="copyToClipboard('js-install')" class="copy-btn">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <pre id="js-install"><code>npm install interviews-tv-api</code></pre>
        </div>

        <div class="code-example">
          <div class="code-header">
            <span>Usage Example</span>
            <button @click="copyToClipboard('js-usage')" class="copy-btn">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <pre id="js-usage"><code>import { InterviewsTVAPI } from 'interviews-tv-api';

const api = new InterviewsTVAPI('your-api-key');

// Get interviews
const interviews = await api.getInterviews({
  page: 1,
  limit: 10,
  search: 'technology'
});

// Create an interview
const newInterview = await api.createInterview({
  title: 'My Interview',
  description: 'Interview description',
  video_url: 'https://example.com/video.mp4',
  tags: ['technology', 'startup']
});</code></pre>
        </div>
      </section>

      <!-- API Usage Statistics -->
      <section class="docs-section">
        <h2>API Usage Statistics</h2>
        <div class="usage-stats">
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(usageStats.total_requests) }}</div>
            <div class="stat-label">Total Requests</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ usageStats.avg_response_time }}ms</div>
            <div class="stat-label">Avg Response Time</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ usageStats.success_rate }}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ usageStats.endpoints_count }}</div>
            <div class="stat-label">Available Endpoints</div>
          </div>
        </div>
      </section>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading API documentation...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'APIDocumentation',
  setup() {
    const notificationStore = useNotificationStore()

    // Reactive state
    const loading = ref(false)
    const testing = ref(false)
    const apiSpec = ref({})
    const selectedEndpoint = ref(null)
    const testParams = reactive({})
    const testRequestBody = ref('')
    const testResponse = ref(null)
    const usageStats = reactive({
      total_requests: 0,
      avg_response_time: 0,
      success_rate: 0,
      endpoints_count: 0
    })

    // Methods
    const loadAPISpec = async () => {
      loading.value = true
      
      try {
        const response = await fetch('/api/docs/openapi.json')
        if (!response.ok) {
          throw new Error('Failed to load API specification')
        }
        
        apiSpec.value = await response.json()
        
        // Load usage statistics
        const statsResponse = await fetch('/api/docs/usage-stats')
        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          Object.assign(usageStats, stats)
        }

      } catch (error) {
        console.error('Failed to load API documentation:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load API documentation'
        })
      } finally {
        loading.value = false
      }
    }

    const selectEndpoint = (path, method) => {
      selectedEndpoint.value = {
        path,
        method,
        operation: apiSpec.value.paths[path][method]
      }
      
      // Reset test data
      Object.keys(testParams).forEach(key => delete testParams[key])
      testRequestBody.value = ''
      testResponse.value = null
      
      // Scroll to endpoint details
      setTimeout(() => {
        document.querySelector('.endpoint-details')?.scrollIntoView({ 
          behavior: 'smooth' 
        })
      }, 100)
    }

    const testEndpoint = async () => {
      if (!selectedEndpoint.value) return
      
      testing.value = true
      
      try {
        let url = selectedEndpoint.value.path
        const queryParams = new URLSearchParams()
        
        // Replace path parameters and build query string
        if (selectedEndpoint.value.operation.parameters) {
          selectedEndpoint.value.operation.parameters.forEach(param => {
            const value = testParams[param.name]
            if (value) {
              if (param.in === 'path') {
                url = url.replace(`{${param.name}}`, value)
              } else if (param.in === 'query') {
                queryParams.append(param.name, value)
              }
            }
          })
        }
        
        if (queryParams.toString()) {
          url += '?' + queryParams.toString()
        }
        
        const options = {
          method: selectedEndpoint.value.method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json'
          }
        }
        
        if (testRequestBody.value && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
          options.body = testRequestBody.value
        }
        
        const response = await fetch(url, options)
        const data = await response.json()
        
        testResponse.value = {
          status: response.status,
          statusText: response.statusText,
          data
        }

      } catch (error) {
        testResponse.value = {
          status: 0,
          statusText: 'Network Error',
          data: { error: error.message }
        }
      } finally {
        testing.value = false
      }
    }

    const downloadSDK = async (language) => {
      try {
        const response = await fetch(`/api/docs/sdk/${language}`)
        if (!response.ok) {
          throw new Error(`Failed to generate ${language} SDK`)
        }
        
        const sdk = await response.json()
        
        const blob = new Blob([sdk.code], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = sdk.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        notificationStore.addNotification({
          type: 'success',
          message: `${language} SDK downloaded successfully`
        })

      } catch (error) {
        console.error(`Failed to download ${language} SDK:`, error)
        notificationStore.addNotification({
          type: 'error',
          message: `Failed to download ${language} SDK`
        })
      }
    }

    const copyToClipboard = async (elementId) => {
      try {
        const element = document.getElementById(elementId)
        const text = element.textContent
        await navigator.clipboard.writeText(text)
        
        notificationStore.addNotification({
          type: 'success',
          message: 'Copied to clipboard'
        })
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
    }

    const scrollTo = (elementId) => {
      document.getElementById(elementId)?.scrollIntoView({ 
        behavior: 'smooth' 
      })
    }

    // Utility functions
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toString()
    }

    const formatSchema = (requestBody) => {
      if (requestBody?.content?.['application/json']?.schema) {
        return JSON.stringify(requestBody.content['application/json'].schema, null, 2)
      }
      return 'No schema available'
    }

    const formatResponseSchema = (content) => {
      if (content?.['application/json']?.schema) {
        return JSON.stringify(content['application/json'].schema, null, 2)
      }
      return 'No schema available'
    }

    const getStatusClass = (statusCode) => {
      const code = parseInt(statusCode)
      if (code >= 200 && code < 300) return 'success'
      if (code >= 400 && code < 500) return 'client-error'
      if (code >= 500) return 'server-error'
      return 'info'
    }

    const getInputType = (schemaType) => {
      switch (schemaType) {
        case 'integer':
        case 'number':
          return 'number'
        case 'boolean':
          return 'checkbox'
        default:
          return 'text'
      }
    }

    // Lifecycle
    onMounted(() => {
      loadAPISpec()
    })

    return {
      // Reactive state
      loading,
      testing,
      apiSpec,
      selectedEndpoint,
      testParams,
      testRequestBody,
      testResponse,
      usageStats,
      
      // Methods
      selectEndpoint,
      testEndpoint,
      downloadSDK,
      copyToClipboard,
      scrollTo,
      formatNumber,
      formatSchema,
      formatResponseSchema,
      getStatusClass,
      getInputType
    }
  }
}
</script>

<style scoped>
.api-documentation {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
}

.docs-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
}

.header-content h1 {
  font-size: 2rem;
  color: #FF0000;
  margin: 0 0 10px 0;
}

.header-content h1 i {
  margin-right: 15px;
}

.docs-subtitle {
  color: #ccc;
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.api-version {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 15px;
  background: #333;
  border-radius: 6px;
}

.version-label {
  font-size: 0.8rem;
  color: #ccc;
}

.version-number {
  font-weight: bold;
  color: #FF0000;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #FF0000;
  color: white;
}

.btn-primary:hover {
  background: #cc0000;
}

.btn-outline {
  background: transparent;
  color: #FF0000;
  border: 1px solid #FF0000;
}

.btn-outline:hover {
  background: #FF0000;
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.docs-nav {
  background: #2a2a2a;
  padding: 20px;
  border-right: 1px solid #333;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.nav-section {
  margin-bottom: 30px;
}

.nav-section h3 {
  color: #FF0000;
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.nav-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-section li {
  margin-bottom: 8px;
}

.nav-section a {
  color: #ccc;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  display: block;
  transition: all 0.3s ease;
}

.nav-section a:hover {
  background: #333;
  color: white;
}

.endpoint-item {
  margin-bottom: 15px;
}

.endpoint-path {
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
  font-family: monospace;
}

.method-list {
  margin-left: 15px;
}

.method-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.method-list li:hover,
.method-list li.active {
  background: #333;
}

.method-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  min-width: 45px;
  text-align: center;
}

.method-badge.get { background: #28a745; color: white; }
.method-badge.post { background: #007bff; color: white; }
.method-badge.put { background: #ffc107; color: #212529; }
.method-badge.patch { background: #17a2b8; color: white; }
.method-badge.delete { background: #dc3545; color: white; }

.operation-summary {
  font-size: 0.9rem;
  color: #ccc;
}

.docs-content {
  padding: 30px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.docs-section {
  margin-bottom: 50px;
}

.docs-section h2 {
  color: #FF0000;
  margin: 0 0 20px 0;
  font-size: 1.8rem;
}

.docs-section h3 {
  color: white;
  margin: 30px 0 15px 0;
  font-size: 1.3rem;
}

.docs-section h4 {
  color: #ccc;
  margin: 20px 0 10px 0;
  font-size: 1.1rem;
}

.docs-section p {
  color: #ccc;
  line-height: 1.6;
  margin-bottom: 15px;
}

.info-box {
  background: #333;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.base-url {
  background: #444;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  color: #FF0000;
  display: block;
  margin-top: 10px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.feature-card {
  background: #333;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.feature-card i {
  font-size: 2rem;
  color: #FF0000;
  margin-bottom: 15px;
}

.feature-card h4 {
  margin: 0 0 10px 0;
  color: white;
}

.feature-card p {
  margin: 0;
  font-size: 0.9rem;
}

.code-example {
  background: #333;
  border-radius: 8px;
  margin: 20px 0;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #444;
  border-bottom: 1px solid #555;
}

.copy-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 5px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.copy-btn:hover {
  background: #555;
  color: white;
}

.code-example pre {
  margin: 0;
  padding: 15px;
  overflow-x: auto;
}

.code-example code {
  font-family: 'Courier New', monospace;
  color: #f8f8f2;
}

.rate-limits {
  display: flex;
  gap: 30px;
  margin: 20px 0;
}

.limit-item {
  text-align: center;
}

.limit-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #FF0000;
}

.limit-label {
  color: #ccc;
  font-size: 0.9rem;
}

.error-codes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.error-code {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: #333;
  border-radius: 6px;
}

.error-code .code {
  font-weight: bold;
  font-family: monospace;
  min-width: 40px;
}

.error-code .code {
  color: #FF0000;
}

.endpoint-details h2 {
  display: flex;
  align-items: center;
  gap: 15px;
}

.endpoint-description {
  font-size: 1.1rem;
  color: #ccc;
  margin-bottom: 30px;
}

.parameters-table {
  background: #333;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 2fr;
  padding: 15px;
  border-bottom: 1px solid #444;
}

.table-header {
  background: #444;
  font-weight: bold;
  color: #ccc;
}

.table-row:hover {
  background: #3a3a3a;
}

.location-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: bold;
}

.location-badge.query { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.location-badge.path { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
.location-badge.header { background: rgba(23, 162, 184, 0.2); color: #17a2b8; }

.required-badge {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: bold;
}

.optional-badge {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: bold;
}

.response-item {
  margin-bottom: 20px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.status-code {
  font-weight: bold;
  font-family: monospace;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-code.success { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.status-code.client-error { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
.status-code.server-error { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
.status-code.info { background: rgba(23, 162, 184, 0.2); color: #17a2b8; }

.try-it-section {
  background: #333;
  padding: 25px;
  border-radius: 8px;
  margin: 30px 0;
}

.api-tester {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.form-section {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #ccc;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  color: white;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  font-family: monospace;
}

.test-response {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
}

.response-status {
  font-weight: bold;
  margin-bottom: 15px;
  padding: 8px 12px;
  border-radius: 4px;
}

.response-body {
  background: #1a1a1a;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}

.response-body pre {
  margin: 0;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.stat-card {
  background: #333;
  padding: 25px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #FF0000;
  display: block;
  margin-bottom: 10px;
}

.stat-label {
  color: #ccc;
  font-size: 0.9rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
}

.loading-spinner i {
  font-size: 3rem;
  color: #FF0000;
  margin-bottom: 20px;
}

.loading-spinner p {
  font-size: 1.2rem;
  color: white;
}

@media (max-width: 1200px) {
  .api-documentation {
    grid-template-columns: 1fr;
  }
  
  .docs-nav {
    max-height: none;
    border-right: none;
    border-bottom: 1px solid #333;
  }
  
  .api-tester {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .rate-limits {
    flex-direction: column;
    gap: 15px;
  }
}

@media (max-width: 768px) {
  .docs-header {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .docs-content {
    padding: 20px;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .usage-stats {
    grid-template-columns: 1fr;
  }
}
</style>
