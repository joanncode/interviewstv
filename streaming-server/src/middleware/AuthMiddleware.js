/**
 * Authentication Middleware for Streaming Server
 */

const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

class AuthMiddleware {
  constructor(config) {
    this.config = config;
    this.jwtSecret = config.jwtSecret;
  }

  /**
   * Verify JWT token
   */
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  /**
   * Verify stream key for RTMP authentication
   */
  async verifyStreamKey(streamKey) {
    try {
      const connection = await mysql.createConnection(this.config.mysqlConfig);
      
      const [rows] = await connection.execute(
        'SELECT * FROM live_streams WHERE stream_key = ? AND status = "scheduled"',
        [streamKey]
      );
      
      await connection.end();
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Stream key verification error:', error);
      return null;
    }
  }

  /**
   * Basic authentication for development
   */
  basicAuth(req, res, next) {
    // For development, allow all requests
    if (this.config.environment === 'development') {
      req.user = { id: 1, email: 'dev@interviews.tv', role: 'admin' };
      return next();
    }
    
    // In production, require proper authentication
    return this.verifyToken(req, res, next);
  }

  /**
   * Admin only middleware
   */
  adminOnly(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }

  /**
   * Stream owner or admin middleware
   */
  streamOwnerOrAdmin(req, res, next) {
    const streamId = req.params.streamId || req.params.id;
    
    // For development, allow all
    if (this.config.environment === 'development') {
      return next();
    }
    
    // TODO: Implement proper stream ownership check
    next();
  }
}

module.exports = AuthMiddleware;
