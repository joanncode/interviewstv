/**
 * MonitoringManager - Comprehensive System Monitoring and Alerting
 * 
 * Handles:
 * - Real-time system health monitoring
 * - Performance metrics collection and analysis
 * - Automated alerting and incident response
 * - Service discovery and health checks
 * - Custom metrics and dashboards
 * - Log aggregation and analysis
 * - Anomaly detection and predictive alerts
 * - SLA monitoring and reporting
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class MonitoringManager extends EventEmitter {
  constructor(dbPool, redisClient, logger) {
    super();
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Monitoring configuration
    this.config = {
      healthChecks: {
        interval: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
        retries: 3,
        services: {
          'streaming-server': { url: 'http://localhost:8081/health', critical: true },
          'database': { url: 'mysql://localhost:3306', critical: true },
          'redis': { url: 'redis://localhost:6379', critical: true },
          'nginx': { url: 'http://localhost:80/health', critical: true },
          'elasticsearch': { url: 'http://localhost:9200/_cluster/health', critical: false },
          'rabbitmq': { url: 'http://localhost:15672/api/overview', critical: false }
        }
      },
      metrics: {
        collection_interval: 15000, // 15 seconds
        retention_period: 2592000, // 30 days
        aggregation_intervals: [60, 300, 3600, 86400], // 1m, 5m, 1h, 1d
        custom_metrics: {
          'stream_count': { type: 'gauge', description: 'Number of active streams' },
          'viewer_count': { type: 'gauge', description: 'Total number of viewers' },
          'bandwidth_usage': { type: 'gauge', description: 'Total bandwidth usage in Mbps' },
          'stream_quality_changes': { type: 'counter', description: 'Number of quality changes' },
          'chat_messages_rate': { type: 'gauge', description: 'Chat messages per second' },
          'api_request_duration': { type: 'histogram', description: 'API request duration' },
          'stream_start_time': { type: 'histogram', description: 'Time to start streaming' },
          'error_rate': { type: 'gauge', description: 'Error rate percentage' }
        }
      },
      alerts: {
        channels: ['email', 'slack', 'webhook', 'sms'],
        severity_levels: ['info', 'warning', 'error', 'critical'],
        rules: {
          'high_cpu_usage': {
            condition: 'cpu_usage > 80',
            duration: '5m',
            severity: 'warning',
            message: 'High CPU usage detected: {{value}}%'
          },
          'high_memory_usage': {
            condition: 'memory_usage > 85',
            duration: '5m',
            severity: 'warning',
            message: 'High memory usage detected: {{value}}%'
          },
          'service_down': {
            condition: 'service_health == 0',
            duration: '1m',
            severity: 'critical',
            message: 'Service {{service}} is down'
          },
          'high_error_rate': {
            condition: 'error_rate > 5',
            duration: '2m',
            severity: 'error',
            message: 'High error rate detected: {{value}}%'
          },
          'slow_response_time': {
            condition: 'avg_response_time > 2000',
            duration: '3m',
            severity: 'warning',
            message: 'Slow response time detected: {{value}}ms'
          },
          'low_disk_space': {
            condition: 'disk_usage > 90',
            duration: '1m',
            severity: 'error',
            message: 'Low disk space: {{value}}% used'
          },
          'stream_failure_rate': {
            condition: 'stream_failure_rate > 10',
            duration: '5m',
            severity: 'error',
            message: 'High stream failure rate: {{value}}%'
          }
        }
      },
      sla: {
        targets: {
          'uptime': 99.9, // 99.9% uptime
          'response_time': 500, // 500ms average response time
          'error_rate': 0.1, // 0.1% error rate
          'stream_success_rate': 99.5 // 99.5% stream success rate
        },
        reporting_interval: 86400000 // 24 hours
      }
    };

    // Monitoring state
    this.serviceHealth = new Map();
    this.metrics = new Map();
    this.alerts = new Map();
    this.incidents = new Map();
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Health check system
   */
  async performHealthChecks() {
    try {
      const healthResults = new Map();
      
      for (const [serviceName, config] of Object.entries(this.config.healthChecks.services)) {
        const health = await this.checkServiceHealth(serviceName, config);
        healthResults.set(serviceName, health);
        
        // Update service health state
        const previousHealth = this.serviceHealth.get(serviceName);
        this.serviceHealth.set(serviceName, health);
        
        // Trigger alerts if health status changed
        if (previousHealth && previousHealth.status !== health.status) {
          await this.handleHealthStatusChange(serviceName, health, previousHealth);
        }
      }
      
      // Calculate overall system health
      const overallHealth = this.calculateOverallHealth(healthResults);
      
      // Store health metrics
      await this.storeHealthMetrics(healthResults, overallHealth);
      
      return { services: healthResults, overall: overallHealth };
    } catch (error) {
      this.logger.error('Error performing health checks:', error);
      throw error;
    }
  }

  /**
   * Individual service health check
   */
  async checkServiceHealth(serviceName, config) {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < this.config.healthChecks.retries) {
      try {
        const health = await this.executeHealthCheck(config.url);
        const responseTime = Date.now() - startTime;
        
        return {
          status: 'healthy',
          responseTime,
          timestamp: new Date(),
          attempt: attempt + 1,
          details: health
        };
      } catch (error) {
        attempt++;
        if (attempt >= this.config.healthChecks.retries) {
          return {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            attempt,
            error: error.message
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Execute health check based on URL type
   */
  async executeHealthCheck(url) {
    if (url.startsWith('http')) {
      return await this.httpHealthCheck(url);
    } else if (url.startsWith('mysql')) {
      return await this.mysqlHealthCheck();
    } else if (url.startsWith('redis')) {
      return await this.redisHealthCheck();
    } else {
      throw new Error(`Unsupported health check URL: ${url}`);
    }
  }

  async httpHealthCheck(url) {
    const response = await fetch(url, {
      method: 'GET',
      timeout: this.config.healthChecks.timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async mysqlHealthCheck() {
    const [rows] = await this.db.execute('SELECT 1 as health');
    return { database: 'connected', rows: rows.length };
  }

  async redisHealthCheck() {
    const pong = await this.redis.ping();
    return { redis: pong === 'PONG' ? 'connected' : 'error' };
  }

  /**
   * Metrics collection and analysis
   */
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        system: await this.collectSystemMetrics(),
        application: await this.collectApplicationMetrics(),
        business: await this.collectBusinessMetrics(),
        custom: await this.collectCustomMetrics()
      };
      
      // Store metrics
      await this.storeMetrics(metrics);
      
      // Analyze metrics for anomalies
      await this.analyzeMetrics(metrics);
      
      // Update real-time metrics
      this.updateRealTimeMetrics(metrics);
      
      return metrics;
    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      loadAverage: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    };
  }

  async collectApplicationMetrics() {
    // Get active streams count
    const activeStreams = await this.redis.scard('active_streams');
    
    // Get total viewers
    const totalViewers = await this.redis.get('total_viewers') || 0;
    
    // Get API request metrics
    const apiMetrics = await this.redis.hgetall('api_metrics') || {};
    
    return {
      activeStreams: parseInt(activeStreams),
      totalViewers: parseInt(totalViewers),
      apiRequests: parseInt(apiMetrics.total_requests || 0),
      apiErrors: parseInt(apiMetrics.total_errors || 0),
      averageResponseTime: parseFloat(apiMetrics.avg_response_time || 0)
    };
  }

  async collectBusinessMetrics() {
    // Revenue metrics
    const dailyRevenue = await this.getDailyRevenue();
    
    // User engagement metrics
    const engagementMetrics = await this.getEngagementMetrics();
    
    // Content metrics
    const contentMetrics = await this.getContentMetrics();
    
    return {
      revenue: dailyRevenue,
      engagement: engagementMetrics,
      content: contentMetrics
    };
  }

  async collectCustomMetrics() {
    const customMetrics = {};
    
    for (const [metricName, config] of Object.entries(this.config.metrics.custom_metrics)) {
      try {
        const value = await this.getCustomMetricValue(metricName);
        customMetrics[metricName] = {
          value,
          type: config.type,
          timestamp: Date.now()
        };
      } catch (error) {
        this.logger.error(`Error collecting custom metric ${metricName}:`, error);
      }
    }
    
    return customMetrics;
  }

  /**
   * Alert management
   */
  async evaluateAlerts(metrics) {
    try {
      for (const [ruleName, rule] of Object.entries(this.config.alerts.rules)) {
        const alertTriggered = await this.evaluateAlertRule(ruleName, rule, metrics);
        
        if (alertTriggered) {
          await this.triggerAlert(ruleName, rule, metrics);
        } else {
          await this.resolveAlert(ruleName);
        }
      }
    } catch (error) {
      this.logger.error('Error evaluating alerts:', error);
    }
  }

  async evaluateAlertRule(ruleName, rule, metrics) {
    // Simple condition evaluation (in production, use a proper expression evaluator)
    const condition = rule.condition;
    
    // Extract metric value based on condition
    const metricValue = this.extractMetricValue(condition, metrics);
    
    // Evaluate condition
    return this.evaluateCondition(condition, metricValue);
  }

  async triggerAlert(ruleName, rule, metrics) {
    const alertId = uuidv4();
    const alert = {
      id: alertId,
      rule: ruleName,
      severity: rule.severity,
      message: this.formatAlertMessage(rule.message, metrics),
      timestamp: new Date(),
      status: 'active',
      metrics
    };
    
    // Store alert
    this.alerts.set(alertId, alert);
    
    // Send notifications
    await this.sendAlertNotifications(alert);
    
    // Log alert
    this.logger.warn(`Alert triggered: ${ruleName}`, alert);
    
    // Emit alert event
    this.emit('alert', alert);
    
    return alert;
  }

  async resolveAlert(ruleName) {
    // Find active alerts for this rule
    for (const [alertId, alert] of this.alerts) {
      if (alert.rule === ruleName && alert.status === 'active') {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        
        // Send resolution notification
        await this.sendAlertResolutionNotification(alert);
        
        this.logger.info(`Alert resolved: ${ruleName}`, { alertId });
        this.emit('alertResolved', alert);
      }
    }
  }

  /**
   * Incident management
   */
  async createIncident(alert) {
    const incidentId = uuidv4();
    const incident = {
      id: incidentId,
      title: `${alert.rule}: ${alert.message}`,
      description: `Automated incident created from alert: ${alert.id}`,
      severity: alert.severity,
      status: 'open',
      alertIds: [alert.id],
      createdAt: new Date(),
      assignee: null,
      tags: ['automated', alert.rule]
    };
    
    this.incidents.set(incidentId, incident);
    
    // Store in database
    await this.storeIncident(incident);
    
    this.logger.error(`Incident created: ${incidentId}`, incident);
    this.emit('incident', incident);
    
    return incident;
  }

  /**
   * SLA monitoring and reporting
   */
  async generateSLAReport() {
    try {
      const endTime = Date.now();
      const startTime = endTime - this.config.sla.reporting_interval;
      
      const report = {
        period: { start: new Date(startTime), end: new Date(endTime) },
        targets: this.config.sla.targets,
        actual: await this.calculateActualSLA(startTime, endTime),
        incidents: await this.getSLAIncidents(startTime, endTime)
      };
      
      // Calculate SLA compliance
      report.compliance = this.calculateSLACompliance(report.targets, report.actual);
      
      // Store SLA report
      await this.storeSLAReport(report);
      
      return report;
    } catch (error) {
      this.logger.error('Error generating SLA report:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  calculateOverallHealth(healthResults) {
    let healthyServices = 0;
    let criticalServices = 0;
    let totalCritical = 0;
    
    for (const [serviceName, health] of healthResults) {
      const serviceConfig = this.config.healthChecks.services[serviceName];
      
      if (health.status === 'healthy') {
        healthyServices++;
      }
      
      if (serviceConfig.critical) {
        totalCritical++;
        if (health.status === 'healthy') {
          criticalServices++;
        }
      }
    }
    
    const overallStatus = criticalServices === totalCritical ? 'healthy' : 'degraded';
    const healthPercentage = (healthyServices / healthResults.size) * 100;
    
    return {
      status: overallStatus,
      healthPercentage,
      healthyServices,
      totalServices: healthResults.size,
      criticalServicesHealthy: criticalServices,
      totalCriticalServices: totalCritical
    };
  }

  async handleHealthStatusChange(serviceName, currentHealth, previousHealth) {
    if (currentHealth.status === 'unhealthy' && previousHealth.status === 'healthy') {
      // Service went down
      await this.triggerAlert('service_down', {
        condition: 'service_health == 0',
        severity: 'critical',
        message: `Service ${serviceName} is down`
      }, { service: serviceName });
    } else if (currentHealth.status === 'healthy' && previousHealth.status === 'unhealthy') {
      // Service recovered
      await this.resolveAlert('service_down');
    }
  }

  async storeHealthMetrics(healthResults, overallHealth) {
    const metrics = {
      timestamp: Date.now(),
      services: Object.fromEntries(healthResults),
      overall: overallHealth
    };
    
    await this.redis.lpush('health_metrics', JSON.stringify(metrics));
    await this.redis.ltrim('health_metrics', 0, 999);
  }

  async storeMetrics(metrics) {
    // Store in Redis for real-time access
    await this.redis.lpush('system_metrics', JSON.stringify(metrics));
    await this.redis.ltrim('system_metrics', 0, 999);
    
    // Store in database for long-term analysis
    const query = `
      INSERT INTO monitoring_metrics (
        timestamp, system_metrics, application_metrics, 
        business_metrics, custom_metrics
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.db.execute(query, [
      new Date(metrics.timestamp),
      JSON.stringify(metrics.system),
      JSON.stringify(metrics.application),
      JSON.stringify(metrics.business),
      JSON.stringify(metrics.custom)
    ]);
  }

  extractMetricValue(condition, metrics) {
    // Simple metric extraction (in production, use a proper parser)
    if (condition.includes('cpu_usage')) {
      return (metrics.system.cpu.user + metrics.system.cpu.system) / 1000000; // Convert to percentage
    }
    if (condition.includes('memory_usage')) {
      return (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    }
    if (condition.includes('error_rate')) {
      const total = metrics.application.apiRequests;
      const errors = metrics.application.apiErrors;
      return total > 0 ? (errors / total) * 100 : 0;
    }
    
    return 0;
  }

  evaluateCondition(condition, value) {
    // Simple condition evaluation
    if (condition.includes('>')) {
      const threshold = parseFloat(condition.split('>')[1].trim());
      return value > threshold;
    }
    if (condition.includes('<')) {
      const threshold = parseFloat(condition.split('<')[1].trim());
      return value < threshold;
    }
    if (condition.includes('==')) {
      const threshold = parseFloat(condition.split('==')[1].trim());
      return value === threshold;
    }
    
    return false;
  }

  formatAlertMessage(template, metrics) {
    // Simple template formatting
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return metrics[key] || match;
    });
  }

  async sendAlertNotifications(alert) {
    // Implementation would send notifications via configured channels
    this.logger.info(`Sending alert notifications for: ${alert.id}`);
  }

  async sendAlertResolutionNotification(alert) {
    // Implementation would send resolution notifications
    this.logger.info(`Sending resolution notification for: ${alert.id}`);
  }

  async storeIncident(incident) {
    const query = `
      INSERT INTO incidents (
        id, title, description, severity, status, 
        alert_ids, created_at, assignee, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.execute(query, [
      incident.id,
      incident.title,
      incident.description,
      incident.severity,
      incident.status,
      JSON.stringify(incident.alertIds),
      incident.createdAt,
      incident.assignee,
      JSON.stringify(incident.tags)
    ]);
  }

  updateRealTimeMetrics(metrics) {
    // Update real-time metrics in Redis
    this.redis.hset('realtime_metrics', {
      'active_streams': metrics.application.activeStreams,
      'total_viewers': metrics.application.totalViewers,
      'cpu_usage': (metrics.system.cpu.user + metrics.system.cpu.system) / 1000000,
      'memory_usage': (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100,
      'timestamp': metrics.timestamp
    });
  }

  async getDailyRevenue() {
    // Implementation would calculate daily revenue
    return 0;
  }

  async getEngagementMetrics() {
    // Implementation would calculate engagement metrics
    return {};
  }

  async getContentMetrics() {
    // Implementation would calculate content metrics
    return {};
  }

  async getCustomMetricValue(metricName) {
    // Implementation would get custom metric values
    return 0;
  }

  async analyzeMetrics(metrics) {
    // Implementation would analyze metrics for anomalies
  }

  async calculateActualSLA(startTime, endTime) {
    // Implementation would calculate actual SLA metrics
    return {};
  }

  async getSLAIncidents(startTime, endTime) {
    // Implementation would get SLA-related incidents
    return [];
  }

  calculateSLACompliance(targets, actual) {
    // Implementation would calculate SLA compliance
    return {};
  }

  async storeSLAReport(report) {
    // Implementation would store SLA report
  }

  /**
   * Start monitoring processes
   */
  startMonitoring() {
    // Health checks
    setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.logger.error('Health check error:', error);
      });
    }, this.config.healthChecks.interval);

    // Metrics collection
    setInterval(() => {
      this.collectMetrics().then(metrics => {
        return this.evaluateAlerts(metrics);
      }).catch(error => {
        this.logger.error('Metrics collection error:', error);
      });
    }, this.config.metrics.collection_interval);

    // SLA reporting
    setInterval(() => {
      this.generateSLAReport().catch(error => {
        this.logger.error('SLA report generation error:', error);
      });
    }, this.config.sla.reporting_interval);

    this.logger.info('Monitoring system started');
  }
}

module.exports = MonitoringManager;
