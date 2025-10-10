/**
 * SecurityMonitor - Advanced Security Monitoring and Protection
 * 
 * Handles:
 * - Intrusion detection and prevention
 * - DDoS protection and mitigation
 * - Advanced rate limiting and throttling
 * - Real-time security monitoring
 * - Anomaly detection and alerting
 * - IP reputation and geoblocking
 * - Bot detection and mitigation
 * - Security incident response
 */

const { v4: uuidv4 } = require('uuid');

class SecurityMonitor {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Security monitoring configuration
    this.config = {
      rateLimiting: {
        global: { requests: 1000, window: 60 }, // 1000 requests per minute globally
        perIP: { requests: 100, window: 60 }, // 100 requests per minute per IP
        perUser: { requests: 200, window: 60 }, // 200 requests per minute per user
        login: { attempts: 5, window: 900 }, // 5 login attempts per 15 minutes
        streaming: { streams: 3, window: 3600 }, // 3 concurrent streams per hour
        api: { requests: 1000, window: 3600 } // 1000 API requests per hour
      },
      ddosProtection: {
        enabled: true,
        thresholds: {
          requestsPerSecond: 100,
          concurrentConnections: 1000,
          bandwidthMbps: 100
        },
        blockDuration: 3600, // 1 hour
        whitelistedIPs: ['127.0.0.1', '::1']
      },
      intrusionDetection: {
        enabled: true,
        suspiciousPatterns: [
          /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
          /<script[^>]*>.*?<\/script>/i, // XSS
          /\.\.\//g, // Path traversal
          /eval\s*\(/i, // Code injection
          /document\.cookie/i // Cookie theft
        ],
        maxViolations: 5,
        blockDuration: 7200 // 2 hours
      },
      anomalyDetection: {
        enabled: true,
        thresholds: {
          unusualLoginLocations: true,
          rapidAccountCreation: 10, // 10 accounts per hour from same IP
          massiveDataAccess: 1000, // 1000 records accessed in 5 minutes
          suspiciousUserAgent: true
        }
      },
      geoBlocking: {
        enabled: false,
        blockedCountries: [], // ISO country codes
        allowedCountries: [] // If specified, only these countries are allowed
      },
      botDetection: {
        enabled: true,
        checks: {
          userAgent: true,
          behaviorAnalysis: true,
          captchaChallenge: true,
          honeypot: true
        },
        suspiciousUserAgents: [
          /bot/i, /crawler/i, /spider/i, /scraper/i
        ]
      }
    };

    // Active monitoring data
    this.activeThreats = new Map();
    this.blockedIPs = new Set();
    this.suspiciousActivities = new Map();
    
    // Start monitoring processes
    this.startSecurityMonitoring();
  }

  /**
   * Advanced rate limiting with multiple layers
   */
  async checkRateLimit(req, limitType = 'global') {
    try {
      const clientIP = this.getClientIP(req);
      const userId = req.user?.id;
      const userAgent = req.headers['user-agent'] || '';
      
      // Check if IP is blocked
      if (await this.isIPBlocked(clientIP)) {
        throw new Error('IP address is blocked due to security violations');
      }

      // Get rate limit configuration
      const config = this.config.rateLimiting[limitType];
      if (!config) {
        return true;
      }

      // Create rate limit keys
      const keys = [
        `rate_limit:${limitType}:global`,
        `rate_limit:${limitType}:ip:${clientIP}`,
        userId ? `rate_limit:${limitType}:user:${userId}` : null
      ].filter(Boolean);

      // Check each rate limit
      for (const key of keys) {
        const current = await this.redis.get(key) || 0;
        const limit = key.includes(':global') ? this.config.rateLimiting.global.requests :
                     key.includes(':ip:') ? this.config.rateLimiting.perIP.requests :
                     this.config.rateLimiting.perUser.requests;

        if (parseInt(current) >= limit) {
          // Log rate limit violation
          await this.logSecurityEvent('rate_limit_exceeded', {
            clientIP,
            userId,
            limitType,
            current: parseInt(current),
            limit,
            userAgent
          });

          // Escalate if repeated violations
          await this.handleRateLimitViolation(clientIP, userId, limitType);
          
          throw new Error(`Rate limit exceeded for ${limitType}`);
        }

        // Increment counter
        await this.redis.incr(key);
        await this.redis.expire(key, config.window);
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking rate limit:', error);
      throw error;
    }
  }

  /**
   * DDoS protection and mitigation
   */
  async checkDDoSProtection(req) {
    try {
      if (!this.config.ddosProtection.enabled) {
        return true;
      }

      const clientIP = this.getClientIP(req);
      
      // Check if IP is whitelisted
      if (this.config.ddosProtection.whitelistedIPs.includes(clientIP)) {
        return true;
      }

      // Check requests per second
      const rpsKey = `ddos:rps:${clientIP}`;
      const currentRPS = await this.redis.get(rpsKey) || 0;
      
      if (parseInt(currentRPS) > this.config.ddosProtection.thresholds.requestsPerSecond) {
        await this.blockIP(clientIP, 'ddos_protection', this.config.ddosProtection.blockDuration);
        throw new Error('DDoS protection triggered - IP blocked');
      }

      // Increment RPS counter
      await this.redis.incr(rpsKey);
      await this.redis.expire(rpsKey, 1); // 1 second window

      // Check concurrent connections
      const connectionsKey = `ddos:connections:${clientIP}`;
      const connections = await this.redis.get(connectionsKey) || 0;
      
      if (parseInt(connections) > this.config.ddosProtection.thresholds.concurrentConnections) {
        await this.blockIP(clientIP, 'too_many_connections', this.config.ddosProtection.blockDuration);
        throw new Error('Too many concurrent connections - IP blocked');
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking DDoS protection:', error);
      throw error;
    }
  }

  /**
   * Intrusion detection system
   */
  async detectIntrusion(req) {
    try {
      if (!this.config.intrusionDetection.enabled) {
        return true;
      }

      const clientIP = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const requestData = {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query
      };

      // Check for suspicious patterns
      const violations = [];
      const dataToCheck = JSON.stringify(requestData);

      for (const pattern of this.config.intrusionDetection.suspiciousPatterns) {
        if (pattern.test(dataToCheck)) {
          violations.push({
            pattern: pattern.toString(),
            matched: dataToCheck.match(pattern)?.[0]
          });
        }
      }

      if (violations.length > 0) {
        // Log intrusion attempt
        await this.logSecurityEvent('intrusion_attempt', {
          clientIP,
          userAgent,
          violations,
          requestData: {
            url: req.url,
            method: req.method,
            userAgent
          }
        });

        // Track violations per IP
        const violationKey = `intrusion:violations:${clientIP}`;
        const currentViolations = await this.redis.incr(violationKey);
        await this.redis.expire(violationKey, 3600); // 1 hour window

        // Block IP if too many violations
        if (currentViolations >= this.config.intrusionDetection.maxViolations) {
          await this.blockIP(clientIP, 'intrusion_detection', this.config.intrusionDetection.blockDuration);
          throw new Error('Intrusion detected - IP blocked');
        }

        // For now, just log but don't block on first violation
        this.logger.warn(`Intrusion attempt detected from ${clientIP}: ${violations.length} violations`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error detecting intrusion:', error);
      throw error;
    }
  }

  /**
   * Anomaly detection
   */
  async detectAnomalies(req, userId = null) {
    try {
      if (!this.config.anomalyDetection.enabled) {
        return true;
      }

      const clientIP = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const anomalies = [];

      // Check for unusual login locations
      if (userId && this.config.anomalyDetection.thresholds.unusualLoginLocations) {
        const isUnusualLocation = await this.checkUnusualLoginLocation(userId, clientIP);
        if (isUnusualLocation) {
          anomalies.push('unusual_login_location');
        }
      }

      // Check for rapid account creation
      if (this.config.anomalyDetection.thresholds.rapidAccountCreation) {
        const accountCreations = await this.redis.get(`anomaly:account_creation:${clientIP}`) || 0;
        if (parseInt(accountCreations) >= this.config.anomalyDetection.thresholds.rapidAccountCreation) {
          anomalies.push('rapid_account_creation');
        }
      }

      // Check for suspicious user agent
      if (this.config.anomalyDetection.thresholds.suspiciousUserAgent) {
        if (this.isSuspiciousUserAgent(userAgent)) {
          anomalies.push('suspicious_user_agent');
        }
      }

      // Log anomalies
      if (anomalies.length > 0) {
        await this.logSecurityEvent('anomaly_detected', {
          clientIP,
          userId,
          userAgent,
          anomalies
        });

        // Add to suspicious activities tracking
        this.suspiciousActivities.set(clientIP, {
          anomalies,
          timestamp: new Date(),
          userId
        });
      }

      return true;
    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      return true; // Don't block on detection errors
    }
  }

  /**
   * Bot detection
   */
  async detectBot(req) {
    try {
      if (!this.config.botDetection.enabled) {
        return { isBot: false };
      }

      const clientIP = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const botIndicators = [];

      // Check user agent
      if (this.config.botDetection.checks.userAgent) {
        for (const pattern of this.config.botDetection.suspiciousUserAgents) {
          if (pattern.test(userAgent)) {
            botIndicators.push('suspicious_user_agent');
            break;
          }
        }
      }

      // Check for missing common headers
      const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
      const missingHeaders = commonHeaders.filter(header => !req.headers[header]);
      if (missingHeaders.length >= 2) {
        botIndicators.push('missing_headers');
      }

      // Check request timing patterns
      const timingPattern = await this.analyzeRequestTiming(clientIP);
      if (timingPattern.isBot) {
        botIndicators.push('timing_pattern');
      }

      const isBot = botIndicators.length >= 2;

      if (isBot) {
        await this.logSecurityEvent('bot_detected', {
          clientIP,
          userAgent,
          indicators: botIndicators
        });

        // Implement bot mitigation (rate limiting, captcha, etc.)
        await this.handleBotDetection(clientIP, botIndicators);
      }

      return { isBot, indicators: botIndicators };
    } catch (error) {
      this.logger.error('Error detecting bot:', error);
      return { isBot: false };
    }
  }

  /**
   * Geographic blocking
   */
  async checkGeoBlocking(req) {
    try {
      if (!this.config.geoBlocking.enabled) {
        return true;
      }

      const clientIP = this.getClientIP(req);
      const country = await this.getCountryFromIP(clientIP);

      // Check blocked countries
      if (this.config.geoBlocking.blockedCountries.includes(country)) {
        await this.logSecurityEvent('geo_blocked', {
          clientIP,
          country,
          reason: 'blocked_country'
        });
        throw new Error(`Access denied from country: ${country}`);
      }

      // Check allowed countries (if specified)
      if (this.config.geoBlocking.allowedCountries.length > 0 &&
          !this.config.geoBlocking.allowedCountries.includes(country)) {
        await this.logSecurityEvent('geo_blocked', {
          clientIP,
          country,
          reason: 'country_not_allowed'
        });
        throw new Error(`Access not allowed from country: ${country}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking geo blocking:', error);
      throw error;
    }
  }

  /**
   * Security incident response
   */
  async handleSecurityIncident(incidentType, data) {
    try {
      const incidentId = uuidv4();
      const incident = {
        id: incidentId,
        type: incidentType,
        severity: this.calculateIncidentSeverity(incidentType, data),
        data,
        timestamp: new Date(),
        status: 'open'
      };

      // Store incident
      await this.storeSecurityIncident(incident);

      // Auto-response based on severity
      if (incident.severity === 'critical') {
        await this.handleCriticalIncident(incident);
      } else if (incident.severity === 'high') {
        await this.handleHighSeverityIncident(incident);
      }

      // Alert security team
      await this.alertSecurityTeam(incident);

      this.logger.warn(`Security incident created: ${incidentId} (${incident.severity})`);
      return incident;
    } catch (error) {
      this.logger.error('Error handling security incident:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           '127.0.0.1';
  }

  async isIPBlocked(ip) {
    const blocked = await this.redis.get(`blocked_ip:${ip}`);
    return blocked !== null;
  }

  async blockIP(ip, reason, duration) {
    await this.redis.setEx(`blocked_ip:${ip}`, duration, JSON.stringify({
      reason,
      blockedAt: new Date(),
      duration
    }));

    this.blockedIPs.add(ip);

    await this.logSecurityEvent('ip_blocked', {
      ip,
      reason,
      duration
    });

    this.logger.warn(`IP blocked: ${ip} for ${reason} (${duration}s)`);
  }

  async handleRateLimitViolation(ip, userId, limitType) {
    const violationKey = `rate_violations:${ip}`;
    const violations = await this.redis.incr(violationKey);
    await this.redis.expire(violationKey, 3600);

    if (violations >= 3) {
      await this.blockIP(ip, 'repeated_rate_limit_violations', 3600);
    }
  }

  async checkUnusualLoginLocation(userId, ip) {
    // Get user's recent login locations
    const recentLocations = await this.redis.lrange(`user_locations:${userId}`, 0, 9);
    const currentCountry = await this.getCountryFromIP(ip);
    
    // If no recent locations, this is not unusual
    if (recentLocations.length === 0) {
      return false;
    }

    // Check if current country is in recent locations
    return !recentLocations.includes(currentCountry);
  }

  isSuspiciousUserAgent(userAgent) {
    // Check for empty or very short user agents
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    // Check for bot patterns
    for (const pattern of this.config.botDetection.suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        return true;
      }
    }

    return false;
  }

  async analyzeRequestTiming(ip) {
    // Analyze request timing patterns to detect bots
    const timingKey = `timing:${ip}`;
    const timestamps = await this.redis.lrange(timingKey, 0, 9);
    
    if (timestamps.length < 5) {
      return { isBot: false };
    }

    // Check for too regular intervals (bot-like behavior)
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

    // Low variance indicates regular, bot-like timing
    return { isBot: variance < 100 };
  }

  async handleBotDetection(ip, indicators) {
    // Implement bot mitigation strategies
    if (indicators.includes('timing_pattern')) {
      // Increase rate limiting for this IP
      await this.redis.setEx(`bot_rate_limit:${ip}`, 3600, '10'); // Limit to 10 requests per hour
    }
  }

  async getCountryFromIP(ip) {
    // In production, integrate with GeoIP service
    // For now, return a default
    return 'US';
  }

  calculateIncidentSeverity(type, data) {
    const severityMap = {
      'ddos_attack': 'critical',
      'intrusion_attempt': 'high',
      'data_breach': 'critical',
      'unauthorized_access': 'high',
      'rate_limit_exceeded': 'medium',
      'bot_detected': 'low'
    };

    return severityMap[type] || 'medium';
  }

  async storeSecurityIncident(incident) {
    const query = `
      INSERT INTO security_incidents (
        id, incident_type, severity, incident_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      incident.id,
      incident.type,
      incident.severity,
      JSON.stringify(incident.data),
      incident.status,
      incident.timestamp
    ]);
  }

  async handleCriticalIncident(incident) {
    // Implement critical incident response
    this.logger.error(`CRITICAL SECURITY INCIDENT: ${incident.id}`);
    // Could trigger automatic lockdown, alert external services, etc.
  }

  async handleHighSeverityIncident(incident) {
    // Implement high severity incident response
    this.logger.warn(`HIGH SEVERITY SECURITY INCIDENT: ${incident.id}`);
  }

  async alertSecurityTeam(incident) {
    // Send alerts to security team
    // Could integrate with Slack, email, PagerDuty, etc.
    this.logger.info(`Security team alerted for incident: ${incident.id}`);
  }

  async logSecurityEvent(eventType, data) {
    const event = {
      id: uuidv4(),
      eventType,
      data,
      timestamp: new Date()
    };

    // Store in database
    const query = `
      INSERT INTO security_events (
        id, event_type, user_id, ip_address, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      event.id,
      event.eventType,
      data.userId || null,
      data.clientIP || data.ip || null,
      JSON.stringify(data),
      event.timestamp
    ]);

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security_events_realtime', JSON.stringify(event));
    await this.redis.ltrim('security_events_realtime', 0, 999);
  }

  /**
   * Start security monitoring processes
   */
  startSecurityMonitoring() {
    // Monitor for security events every 30 seconds
    setInterval(() => {
      this.monitorSecurityMetrics();
    }, 30000);

    // Clean up old data every hour
    setInterval(() => {
      this.cleanupSecurityData();
    }, 3600000);

    this.logger.info('Security monitoring started');
  }

  async monitorSecurityMetrics() {
    try {
      // Monitor blocked IPs
      const blockedIPsCount = await this.redis.keys('blocked_ip:*');
      
      // Monitor rate limit violations
      const rateLimitViolations = await this.redis.keys('rate_violations:*');
      
      // Monitor active threats
      const activeThreatsCount = this.activeThreats.size;

      // Log metrics
      this.logger.debug(`Security metrics: ${blockedIPsCount.length} blocked IPs, ${rateLimitViolations.length} rate limit violations, ${activeThreatsCount} active threats`);
    } catch (error) {
      this.logger.error('Error monitoring security metrics:', error);
    }
  }

  async cleanupSecurityData() {
    try {
      // Clean up expired blocked IPs
      const expiredIPs = [];
      for (const ip of this.blockedIPs) {
        const blocked = await this.redis.get(`blocked_ip:${ip}`);
        if (!blocked) {
          expiredIPs.push(ip);
        }
      }

      expiredIPs.forEach(ip => this.blockedIPs.delete(ip));

      // Clean up old suspicious activities
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      for (const [ip, activity] of this.suspiciousActivities) {
        if (activity.timestamp.getTime() < cutoffTime) {
          this.suspiciousActivities.delete(ip);
        }
      }

      this.logger.debug(`Security cleanup: removed ${expiredIPs.length} expired IPs, cleaned suspicious activities`);
    } catch (error) {
      this.logger.error('Error cleaning up security data:', error);
    }
  }
}

module.exports = SecurityMonitor;
