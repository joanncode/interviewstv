/**
 * CDNManager - Content Delivery Network and Global Distribution
 * 
 * Handles:
 * - Multi-CDN management and failover
 * - Geographic content distribution
 * - Edge caching and optimization
 * - Dynamic content routing
 * - Bandwidth optimization
 * - Real-time CDN analytics
 * - Cache invalidation and purging
 * - Global load balancing
 */

const { v4: uuidv4 } = require('uuid');

class CDNManager {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // CDN configuration
    this.config = {
      providers: {
        cloudflare: {
          enabled: true,
          priority: 1,
          regions: ['global'],
          apiKey: process.env.CLOUDFLARE_API_KEY,
          zoneId: process.env.CLOUDFLARE_ZONE_ID,
          endpoints: {
            api: 'https://api.cloudflare.com/client/v4',
            purge: '/zones/{zone_id}/purge_cache'
          }
        },
        aws_cloudfront: {
          enabled: true,
          priority: 2,
          regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
          accessKey: process.env.AWS_ACCESS_KEY_ID,
          secretKey: process.env.AWS_SECRET_ACCESS_KEY,
          distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID
        },
        fastly: {
          enabled: false,
          priority: 3,
          regions: ['global'],
          apiKey: process.env.FASTLY_API_KEY,
          serviceId: process.env.FASTLY_SERVICE_ID
        }
      },
      caching: {
        rules: {
          'static_assets': {
            pattern: /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
            ttl: 31536000, // 1 year
            headers: {
              'Cache-Control': 'public, immutable, max-age=31536000',
              'Expires': new Date(Date.now() + 31536000000).toUTCString()
            }
          },
          'media_content': {
            pattern: /\.(mp4|webm|m3u8|ts|mp3|aac)$/,
            ttl: 86400, // 1 day
            headers: {
              'Cache-Control': 'public, max-age=86400',
              'Expires': new Date(Date.now() + 86400000).toUTCString()
            }
          },
          'api_responses': {
            pattern: /^\/api\//,
            ttl: 300, // 5 minutes
            headers: {
              'Cache-Control': 'public, max-age=300',
              'Vary': 'Accept-Encoding, Authorization'
            }
          },
          'dynamic_content': {
            pattern: /\.(html|php)$/,
            ttl: 0, // No caching
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        },
        compression: {
          enabled: true,
          algorithms: ['gzip', 'brotli'],
          minSize: 1024,
          types: ['text/html', 'text/css', 'text/javascript', 'application/json', 'application/javascript']
        }
      },
      loadBalancing: {
        algorithm: 'least_connections', // round_robin, least_connections, ip_hash, geographic
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3,
          path: '/health'
        },
        failover: {
          enabled: true,
          threshold: 3, // Number of failed health checks before failover
          cooldown: 300000 // 5 minutes cooldown before retry
        }
      },
      geographic: {
        enabled: true,
        regions: {
          'us-east': {
            name: 'US East',
            countries: ['US', 'CA'],
            servers: ['us-east-1.interviews.tv', 'us-east-2.interviews.tv'],
            cdn: 'aws_cloudfront'
          },
          'us-west': {
            name: 'US West',
            countries: ['US', 'CA', 'MX'],
            servers: ['us-west-1.interviews.tv', 'us-west-2.interviews.tv'],
            cdn: 'aws_cloudfront'
          },
          'europe': {
            name: 'Europe',
            countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK'],
            servers: ['eu-west-1.interviews.tv', 'eu-central-1.interviews.tv'],
            cdn: 'cloudflare'
          },
          'asia-pacific': {
            name: 'Asia Pacific',
            countries: ['JP', 'KR', 'SG', 'AU', 'IN', 'TH', 'VN'],
            servers: ['ap-southeast-1.interviews.tv', 'ap-northeast-1.interviews.tv'],
            cdn: 'cloudflare'
          }
        }
      }
    };

    // CDN state
    this.serverHealth = new Map();
    this.connectionCounts = new Map();
    this.responseTimeHistory = new Map();
    this.failedServers = new Set();
    
    // Start CDN monitoring
    this.startCDNMonitoring();
  }

  /**
   * Route request to optimal server based on geographic location and load
   */
  async routeRequest(clientIP, requestPath, userAgent = '') {
    try {
      // Determine client location
      const clientLocation = await this.getClientLocation(clientIP);
      
      // Find optimal region
      const optimalRegion = this.findOptimalRegion(clientLocation);
      
      // Select best server in region
      const selectedServer = await this.selectOptimalServer(optimalRegion, requestPath);
      
      // Apply caching rules
      const cacheConfig = this.applyCachingRules(requestPath);
      
      // Log routing decision
      await this.logRoutingDecision(clientIP, selectedServer, optimalRegion, cacheConfig);
      
      return {
        server: selectedServer,
        region: optimalRegion,
        caching: cacheConfig,
        cdn: this.config.geographic.regions[optimalRegion].cdn
      };
    } catch (error) {
      this.logger.error('Error routing request:', error);
      // Fallback to default server
      return this.getDefaultRouting();
    }
  }

  /**
   * Select optimal server based on load balancing algorithm
   */
  async selectOptimalServer(region, requestPath) {
    try {
      const regionConfig = this.config.geographic.regions[region];
      if (!regionConfig) {
        throw new Error(`Invalid region: ${region}`);
      }

      const availableServers = regionConfig.servers.filter(server => 
        !this.failedServers.has(server) && this.isServerHealthy(server)
      );

      if (availableServers.length === 0) {
        throw new Error(`No healthy servers available in region: ${region}`);
      }

      let selectedServer;
      
      switch (this.config.loadBalancing.algorithm) {
        case 'round_robin':
          selectedServer = this.roundRobinSelection(availableServers);
          break;
        case 'least_connections':
          selectedServer = this.leastConnectionsSelection(availableServers);
          break;
        case 'ip_hash':
          selectedServer = this.ipHashSelection(availableServers, requestPath);
          break;
        case 'geographic':
          selectedServer = this.geographicSelection(availableServers);
          break;
        default:
          selectedServer = availableServers[0];
      }

      // Update connection count
      this.incrementConnectionCount(selectedServer);
      
      return selectedServer;
    } catch (error) {
      this.logger.error('Error selecting optimal server:', error);
      throw error;
    }
  }

  /**
   * Cache management and invalidation
   */
  async invalidateCache(patterns, provider = 'all') {
    try {
      const invalidationResults = {};
      
      if (provider === 'all') {
        // Invalidate on all enabled CDN providers
        for (const [providerName, config] of Object.entries(this.config.providers)) {
          if (config.enabled) {
            invalidationResults[providerName] = await this.invalidateCDNCache(providerName, patterns);
          }
        }
      } else {
        // Invalidate on specific provider
        invalidationResults[provider] = await this.invalidateCDNCache(provider, patterns);
      }
      
      // Log cache invalidation
      await this.logCacheInvalidation(patterns, provider, invalidationResults);
      
      return invalidationResults;
    } catch (error) {
      this.logger.error('Error invalidating cache:', error);
      throw error;
    }
  }

  /**
   * CDN-specific cache invalidation
   */
  async invalidateCDNCache(provider, patterns) {
    try {
      switch (provider) {
        case 'cloudflare':
          return await this.invalidateCloudflareCache(patterns);
        case 'aws_cloudfront':
          return await this.invalidateCloudFrontCache(patterns);
        case 'fastly':
          return await this.invalidateFastlyCache(patterns);
        default:
          throw new Error(`Unsupported CDN provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating ${provider} cache:`, error);
      throw error;
    }
  }

  async invalidateCloudflareCache(patterns) {
    const config = this.config.providers.cloudflare;
    const url = `${config.endpoints.api}${config.endpoints.purge.replace('{zone_id}', config.zoneId)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: patterns
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`);
    }
    
    return await response.json();
  }

  async invalidateCloudFrontCache(patterns) {
    // AWS CloudFront invalidation implementation
    // This would use AWS SDK in production
    this.logger.info('CloudFront cache invalidation requested', { patterns });
    return { status: 'success', patterns };
  }

  async invalidateFastlyCache(patterns) {
    // Fastly cache invalidation implementation
    this.logger.info('Fastly cache invalidation requested', { patterns });
    return { status: 'success', patterns };
  }

  /**
   * Real-time CDN analytics and monitoring
   */
  async collectCDNAnalytics() {
    try {
      const analytics = {
        timestamp: Date.now(),
        providers: {},
        global: {
          totalRequests: 0,
          totalBandwidth: 0,
          cacheHitRatio: 0,
          averageResponseTime: 0
        }
      };

      // Collect analytics from each CDN provider
      for (const [providerName, config] of Object.entries(this.config.providers)) {
        if (config.enabled) {
          analytics.providers[providerName] = await this.getCDNProviderAnalytics(providerName);
          
          // Aggregate global metrics
          const providerMetrics = analytics.providers[providerName];
          analytics.global.totalRequests += providerMetrics.requests || 0;
          analytics.global.totalBandwidth += providerMetrics.bandwidth || 0;
        }
      }

      // Calculate global averages
      const providerCount = Object.keys(analytics.providers).length;
      if (providerCount > 0) {
        analytics.global.cacheHitRatio = Object.values(analytics.providers)
          .reduce((sum, provider) => sum + (provider.cacheHitRatio || 0), 0) / providerCount;
        
        analytics.global.averageResponseTime = Object.values(analytics.providers)
          .reduce((sum, provider) => sum + (provider.averageResponseTime || 0), 0) / providerCount;
      }

      // Store analytics
      await this.storeCDNAnalytics(analytics);
      
      return analytics;
    } catch (error) {
      this.logger.error('Error collecting CDN analytics:', error);
      throw error;
    }
  }

  async getCDNProviderAnalytics(provider) {
    // Implementation would fetch real analytics from CDN providers
    // This is a placeholder that returns mock data
    return {
      requests: Math.floor(Math.random() * 10000),
      bandwidth: Math.floor(Math.random() * 1000), // GB
      cacheHitRatio: 0.85 + Math.random() * 0.1, // 85-95%
      averageResponseTime: 50 + Math.random() * 100, // 50-150ms
      errors: Math.floor(Math.random() * 10),
      topCountries: ['US', 'GB', 'DE', 'JP', 'CA']
    };
  }

  /**
   * Health monitoring for CDN endpoints
   */
  async performCDNHealthChecks() {
    try {
      const healthResults = new Map();
      
      // Check all regions and servers
      for (const [regionName, regionConfig] of Object.entries(this.config.geographic.regions)) {
        for (const server of regionConfig.servers) {
          const health = await this.checkServerHealth(server);
          healthResults.set(server, health);
          
          // Update server health state
          this.serverHealth.set(server, health);
          
          // Handle server failures
          if (!health.healthy) {
            await this.handleServerFailure(server, regionName);
          } else {
            // Remove from failed servers if it's healthy again
            this.failedServers.delete(server);
          }
        }
      }
      
      return healthResults;
    } catch (error) {
      this.logger.error('Error performing CDN health checks:', error);
      throw error;
    }
  }

  async checkServerHealth(server) {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < this.config.loadBalancing.healthCheck.retries) {
      try {
        const response = await fetch(`https://${server}${this.config.loadBalancing.healthCheck.path}`, {
          method: 'GET',
          timeout: this.config.loadBalancing.healthCheck.timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          // Update response time history
          this.updateResponseTimeHistory(server, responseTime);
          
          return {
            healthy: true,
            responseTime,
            status: response.status,
            attempt: attempt + 1
          };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        attempt++;
        if (attempt >= this.config.loadBalancing.healthCheck.retries) {
          return {
            healthy: false,
            responseTime: Date.now() - startTime,
            error: error.message,
            attempt
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Helper methods
   */
  async getClientLocation(clientIP) {
    // In production, use a GeoIP service
    // This is a placeholder implementation
    const mockLocations = {
      '127.0.0.1': { country: 'US', region: 'us-east' },
      '192.168.1.1': { country: 'US', region: 'us-west' }
    };
    
    return mockLocations[clientIP] || { country: 'US', region: 'us-east' };
  }

  findOptimalRegion(clientLocation) {
    // Find region that serves the client's country
    for (const [regionName, regionConfig] of Object.entries(this.config.geographic.regions)) {
      if (regionConfig.countries.includes(clientLocation.country)) {
        return regionName;
      }
    }
    
    // Default to us-east if no specific region found
    return 'us-east';
  }

  applyCachingRules(requestPath) {
    for (const [ruleName, rule] of Object.entries(this.config.caching.rules)) {
      if (rule.pattern.test(requestPath)) {
        return {
          rule: ruleName,
          ttl: rule.ttl,
          headers: rule.headers
        };
      }
    }
    
    // Default caching rule
    return this.config.caching.rules.dynamic_content;
  }

  getDefaultRouting() {
    return {
      server: 'us-east-1.interviews.tv',
      region: 'us-east',
      caching: this.config.caching.rules.dynamic_content,
      cdn: 'cloudflare'
    };
  }

  isServerHealthy(server) {
    const health = this.serverHealth.get(server);
    return health ? health.healthy : true; // Assume healthy if no data
  }

  roundRobinSelection(servers) {
    // Simple round-robin implementation
    const index = Date.now() % servers.length;
    return servers[index];
  }

  leastConnectionsSelection(servers) {
    let minConnections = Infinity;
    let selectedServer = servers[0];
    
    for (const server of servers) {
      const connections = this.connectionCounts.get(server) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedServer = server;
      }
    }
    
    return selectedServer;
  }

  ipHashSelection(servers, requestPath) {
    // Simple hash-based selection
    const hash = this.simpleHash(requestPath);
    const index = hash % servers.length;
    return servers[index];
  }

  geographicSelection(servers) {
    // Select server with best response time
    let bestServer = servers[0];
    let bestResponseTime = Infinity;
    
    for (const server of servers) {
      const history = this.responseTimeHistory.get(server) || [];
      if (history.length > 0) {
        const avgResponseTime = history.reduce((sum, time) => sum + time, 0) / history.length;
        if (avgResponseTime < bestResponseTime) {
          bestResponseTime = avgResponseTime;
          bestServer = server;
        }
      }
    }
    
    return bestServer;
  }

  incrementConnectionCount(server) {
    const current = this.connectionCounts.get(server) || 0;
    this.connectionCounts.set(server, current + 1);
  }

  updateResponseTimeHistory(server, responseTime) {
    const history = this.responseTimeHistory.get(server) || [];
    history.push(responseTime);
    
    // Keep only last 100 measurements
    if (history.length > 100) {
      history.shift();
    }
    
    this.responseTimeHistory.set(server, history);
  }

  async handleServerFailure(server, region) {
    this.failedServers.add(server);
    
    // Log server failure
    this.logger.error(`Server failure detected: ${server} in region ${region}`);
    
    // Schedule retry after cooldown
    setTimeout(() => {
      this.failedServers.delete(server);
      this.logger.info(`Server ${server} added back to rotation after cooldown`);
    }, this.config.loadBalancing.failover.cooldown);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async logRoutingDecision(clientIP, server, region, cacheConfig) {
    const logEntry = {
      timestamp: new Date(),
      clientIP,
      server,
      region,
      cacheRule: cacheConfig.rule,
      cacheTTL: cacheConfig.ttl
    };
    
    await this.redis.lpush('routing_logs', JSON.stringify(logEntry));
    await this.redis.ltrim('routing_logs', 0, 9999); // Keep last 10k entries
  }

  async logCacheInvalidation(patterns, provider, results) {
    const logEntry = {
      timestamp: new Date(),
      patterns,
      provider,
      results
    };
    
    await this.redis.lpush('cache_invalidation_logs', JSON.stringify(logEntry));
    await this.redis.ltrim('cache_invalidation_logs', 0, 999);
  }

  async storeCDNAnalytics(analytics) {
    // Store in Redis for real-time access
    await this.redis.set('cdn_analytics_latest', JSON.stringify(analytics));
    await this.redis.lpush('cdn_analytics_history', JSON.stringify(analytics));
    await this.redis.ltrim('cdn_analytics_history', 0, 999);
    
    // Store in database for long-term analysis
    const query = `
      INSERT INTO cdn_analytics (
        timestamp, provider_analytics, global_metrics
      ) VALUES (?, ?, ?)
    `;
    
    await this.db.execute(query, [
      new Date(analytics.timestamp),
      JSON.stringify(analytics.providers),
      JSON.stringify(analytics.global)
    ]);
  }

  /**
   * Start CDN monitoring processes
   */
  startCDNMonitoring() {
    // Health checks every 30 seconds
    setInterval(() => {
      this.performCDNHealthChecks().catch(error => {
        this.logger.error('CDN health check error:', error);
      });
    }, this.config.loadBalancing.healthCheck.interval);

    // Analytics collection every 5 minutes
    setInterval(() => {
      this.collectCDNAnalytics().catch(error => {
        this.logger.error('CDN analytics collection error:', error);
      });
    }, 300000);

    // Connection count cleanup every minute
    setInterval(() => {
      // Decay connection counts to prevent stale data
      for (const [server, count] of this.connectionCounts) {
        const newCount = Math.max(0, count - 1);
        if (newCount === 0) {
          this.connectionCounts.delete(server);
        } else {
          this.connectionCounts.set(server, newCount);
        }
      }
    }, 60000);

    this.logger.info('CDN monitoring started');
  }
}

module.exports = CDNManager;
