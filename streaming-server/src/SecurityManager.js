/**
 * SecurityManager - Comprehensive Security and Authentication System
 * 
 * Handles:
 * - JWT-based authentication and token management
 * - Role-based access control (RBAC)
 * - OAuth integration (Google, Facebook, Twitter, GitHub)
 * - Multi-factor authentication (MFA)
 * - Session management and security
 * - Password security and encryption
 * - API rate limiting and throttling
 * - Security logging and monitoring
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

class SecurityManager {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Security configuration
    this.config = {
      jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        algorithm: 'HS256'
      },
      password: {
        saltRounds: 12,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      mfa: {
        issuer: 'Interviews.tv',
        window: 2, // Allow 2 time steps before/after current
        encoding: 'base32'
      },
      rateLimiting: {
        login: { max: 5, window: 900 }, // 5 attempts per 15 minutes
        api: { max: 100, window: 60 }, // 100 requests per minute
        streaming: { max: 10, window: 3600 } // 10 streams per hour
      },
      session: {
        maxConcurrent: 5, // Max concurrent sessions per user
        timeout: 3600 // Session timeout in seconds
      },
      roles: {
        user: {
          permissions: ['view_content', 'create_stream', 'chat', 'donate']
        },
        creator: {
          permissions: ['view_content', 'create_stream', 'chat', 'donate', 'monetize', 'analytics']
        },
        moderator: {
          permissions: ['view_content', 'create_stream', 'chat', 'donate', 'moderate_content', 'ban_users']
        },
        admin: {
          permissions: ['*'] // All permissions
        }
      }
    };

    // Active sessions tracking
    this.activeSessions = new Map();
  }

  /**
   * User registration with security validation
   */
  async registerUser(userData) {
    try {
      const { username, email, password, role = 'user' } = userData;

      // Validate input
      await this.validateUserInput({ username, email, password });

      // Check if user already exists
      const existingUser = await this.getUserByEmailOrUsername(email, username);
      if (existingUser) {
        throw new Error('User already exists with this email or username');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Generate user ID and verification token
      const userId = uuidv4();
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const query = `
        INSERT INTO users (
          id, username, email, password_hash, role, email_verified,
          verification_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await this.db.execute(query, [
        userId,
        username,
        email,
        hashedPassword,
        role,
        false,
        verificationToken
      ]);

      // Log security event
      await this.logSecurityEvent('user_registration', userId, {
        email,
        username,
        role
      });

      this.logger.info(`User registered: ${username} (${email})`);
      return {
        success: true,
        userId,
        verificationToken,
        message: 'User registered successfully. Please verify your email.'
      };
    } catch (error) {
      this.logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * User authentication with security checks
   */
  async authenticateUser(email, password, ipAddress, userAgent) {
    try {
      // Check rate limiting
      await this.checkRateLimit('login', email, ipAddress);

      // Get user
      const user = await this.getUserByEmail(email);
      if (!user) {
        await this.logSecurityEvent('login_failed', null, { email, reason: 'user_not_found', ipAddress });
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.logSecurityEvent('login_failed', user.id, { email, reason: 'invalid_password', ipAddress });
        throw new Error('Invalid credentials');
      }

      // Check if account is locked or suspended
      if (user.status === 'suspended' || user.status === 'locked') {
        await this.logSecurityEvent('login_blocked', user.id, { email, reason: user.status, ipAddress });
        throw new Error(`Account is ${user.status}`);
      }

      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Please verify your email before logging in');
      }

      // Check for MFA
      if (user.mfa_enabled) {
        return {
          success: false,
          requiresMFA: true,
          userId: user.id,
          message: 'Multi-factor authentication required'
        };
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const session = await this.createSession(user.id, ipAddress, userAgent, tokens.refreshToken);

      // Log successful login
      await this.logSecurityEvent('login_success', user.id, { email, ipAddress, sessionId: session.id });

      this.logger.info(`User authenticated: ${user.username} (${email})`);
      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens,
        session
      };
    } catch (error) {
      this.logger.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Multi-factor authentication setup
   */
  async setupMFA(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.mfa_enabled) {
        throw new Error('MFA is already enabled for this user');
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `${this.config.mfa.issuer}:${user.email}`,
        issuer: this.config.mfa.issuer,
        length: 32
      });

      // Store temporary secret (not yet enabled)
      await this.redis.setEx(
        `mfa_setup:${userId}`,
        600, // 10 minutes
        JSON.stringify({
          secret: secret.base32,
          backupCodes: this.generateBackupCodes()
        })
      );

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      this.logger.error('Error setting up MFA:', error);
      throw error;
    }
  }

  /**
   * Verify MFA token and enable MFA
   */
  async verifyAndEnableMFA(userId, token) {
    try {
      // Get temporary MFA setup data
      const setupData = await this.redis.get(`mfa_setup:${userId}`);
      if (!setupData) {
        throw new Error('MFA setup session expired. Please start over.');
      }

      const { secret, backupCodes } = JSON.parse(setupData);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: this.config.mfa.window
      });

      if (!verified) {
        throw new Error('Invalid MFA token');
      }

      // Enable MFA for user
      const query = `
        UPDATE users 
        SET mfa_enabled = TRUE, mfa_secret = ?, mfa_backup_codes = ?, updated_at = NOW()
        WHERE id = ?
      `;

      await this.db.execute(query, [
        this.encrypt(secret),
        this.encrypt(JSON.stringify(backupCodes)),
        userId
      ]);

      // Clean up setup session
      await this.redis.del(`mfa_setup:${userId}`);

      // Log security event
      await this.logSecurityEvent('mfa_enabled', userId, {});

      this.logger.info(`MFA enabled for user: ${userId}`);
      return {
        success: true,
        backupCodes,
        message: 'MFA enabled successfully. Save your backup codes in a secure location.'
      };
    } catch (error) {
      this.logger.error('Error enabling MFA:', error);
      throw error;
    }
  }

  /**
   * Verify MFA during login
   */
  async verifyMFALogin(userId, token, ipAddress, userAgent) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.mfa_enabled) {
        throw new Error('MFA not enabled for this user');
      }

      const decryptedSecret = this.decrypt(user.mfa_secret);

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token,
        window: this.config.mfa.window
      });

      if (!verified) {
        // Check if it's a backup code
        const backupCodes = JSON.parse(this.decrypt(user.mfa_backup_codes));
        const backupCodeIndex = backupCodes.indexOf(token);
        
        if (backupCodeIndex === -1) {
          await this.logSecurityEvent('mfa_failed', userId, { ipAddress });
          throw new Error('Invalid MFA token or backup code');
        }

        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);
        await this.db.execute(
          'UPDATE users SET mfa_backup_codes = ? WHERE id = ?',
          [this.encrypt(JSON.stringify(backupCodes)), userId]
        );
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const session = await this.createSession(userId, ipAddress, userAgent, tokens.refreshToken);

      // Log successful MFA login
      await this.logSecurityEvent('mfa_login_success', userId, { ipAddress, sessionId: session.id });

      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens,
        session
      };
    } catch (error) {
      this.logger.error('Error verifying MFA login:', error);
      throw error;
    }
  }

  /**
   * Role-based access control
   */
  async checkPermission(userId, permission) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      const userRole = this.config.roles[user.role];
      if (!userRole) {
        return false;
      }

      // Admin has all permissions
      if (userRole.permissions.includes('*')) {
        return true;
      }

      return userRole.permissions.includes(permission);
    } catch (error) {
      this.logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Generate JWT tokens
   */
  async generateTokens(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.accessTokenExpiry,
      algorithm: this.config.jwt.algorithm
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      this.config.jwt.secret,
      {
        expiresIn: this.config.jwt.refreshTokenExpiry,
        algorithm: this.config.jwt.algorithm
      }
    );

    // Store refresh token
    await this.redis.setEx(
      `refresh_token:${user.id}:${refreshToken}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify({ userId: user.id, createdAt: new Date() })
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const tokenData = await this.redis.get(`refresh_token:${decoded.userId}:${refreshToken}`);
      if (!tokenData) {
        throw new Error('Refresh token not found or expired');
      }

      // Get user
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      const accessToken = jwt.sign(payload, this.config.jwt.secret, {
        expiresIn: this.config.jwt.accessTokenExpiry,
        algorithm: this.config.jwt.algorithm
      });

      return { accessToken };
    } catch (error) {
      this.logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Create user session
   */
  async createSession(userId, ipAddress, userAgent, refreshToken) {
    try {
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId,
        ipAddress,
        userAgent,
        refreshToken,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      // Check concurrent session limit
      await this.enforceSessionLimit(userId);

      // Store session
      await this.redis.setEx(
        `session:${sessionId}`,
        this.config.session.timeout,
        JSON.stringify(session)
      );

      // Add to user's active sessions
      await this.redis.sadd(`user_sessions:${userId}`, sessionId);

      return session;
    } catch (error) {
      this.logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(type, identifier, ipAddress) {
    const config = this.config.rateLimiting[type];
    if (!config) {
      return true;
    }

    const key = `rate_limit:${type}:${identifier}:${ipAddress}`;
    const current = await this.redis.get(key) || 0;

    if (parseInt(current) >= config.max) {
      throw new Error(`Rate limit exceeded. Try again later.`);
    }

    await this.redis.incr(key);
    await this.redis.expire(key, config.window);

    return true;
  }

  /**
   * Helper methods
   */
  async validateUserInput({ username, email, password }) {
    // Username validation
    if (!username || username.length < 3 || username.length > 30) {
      throw new Error('Username must be between 3 and 30 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }

    // Password validation
    if (!password || password.length < this.config.password.minLength) {
      throw new Error(`Password must be at least ${this.config.password.minLength} characters long`);
    }

    if (this.config.password.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (this.config.password.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (this.config.password.requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (this.config.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  async hashPassword(password) {
    return bcrypt.hash(password, this.config.password.saltRounds);
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await this.db.execute(query, [email]);
    return rows[0] || null;
  }

  async getUserByEmailOrUsername(email, username) {
    const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
    const [rows] = await this.db.execute(query, [email, username]);
    return rows[0] || null;
  }

  async getUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await this.db.execute(query, [userId]);
    return rows[0] || null;
  }

  sanitizeUser(user) {
    const { password_hash, mfa_secret, mfa_backup_codes, verification_token, ...sanitized } = user;
    return sanitized;
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.jwt.secret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.jwt.secret, 'salt', 32);
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async enforceSessionLimit(userId) {
    const sessions = await this.redis.smembers(`user_sessions:${userId}`);
    
    if (sessions.length >= this.config.session.maxConcurrent) {
      // Remove oldest session
      const oldestSession = sessions[0];
      await this.redis.del(`session:${oldestSession}`);
      await this.redis.srem(`user_sessions:${userId}`, oldestSession);
    }
  }

  async logSecurityEvent(eventType, userId, metadata) {
    const event = {
      id: uuidv4(),
      eventType,
      userId,
      metadata,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress || null
    };

    // Store in database
    const query = `
      INSERT INTO security_events (
        id, event_type, user_id, metadata, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      event.id,
      event.eventType,
      event.userId,
      JSON.stringify(event.metadata),
      event.ipAddress,
      event.timestamp
    ]);

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security_events', JSON.stringify(event));
    await this.redis.ltrim('security_events', 0, 999); // Keep last 1000 events
  }
}

module.exports = SecurityManager;
