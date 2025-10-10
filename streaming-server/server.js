#!/usr/bin/env node

/**
 * Interviews.tv Live Streaming Media Server
 * 
 * This server handles:
 * - RTMP stream ingestion
 * - HLS/DASH output generation
 * - WebRTC signaling
 * - Stream authentication
 * - Real-time analytics
 * - Chat and viewer management
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const NodeMediaServer = require('node-media-server');
const redis = require('redis');
const mysql = require('mysql2/promise');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Import custom modules
const StreamManager = require('./src/StreamManager');
const WebRTCSignaling = require('./src/WebRTCSignaling');
const ChatManager = require('./src/ChatManager');
const AnalyticsCollector = require('./src/AnalyticsCollector');
const QualityManager = require('./src/QualityManager');
const RecordingManager = require('./src/RecordingManager');
const BroadcastingTools = require('./src/BroadcastingTools');
const AnalyticsDashboard = require('./src/AnalyticsDashboard');
const MonetizationManager = require('./src/MonetizationManager');
const ContentManager = require('./src/ContentManager');
const SecurityManager = require('./src/SecurityManager');
const PrivacyManager = require('./src/PrivacyManager');
const SecurityMonitor = require('./src/SecurityMonitor');
const ComplianceManager = require('./src/ComplianceManager');
const PerformanceOptimizer = require('./src/PerformanceOptimizer');
const MonitoringManager = require('./src/MonitoringManager');
const CDNManager = require('./src/CDNManager');
const AuthMiddleware = require('./src/middleware/AuthMiddleware');

// Configuration
const config = {
  port: process.env.STREAMING_PORT || 8081,
  rtmpPort: process.env.RTMP_PORT || 1935,
  httpPort: process.env.HTTP_PORT || 8080,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  mysqlConfig: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'interviews_tv',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  environment: process.env.NODE_ENV || 'development'
};

// Logger setup
const logger = winston.createLogger({
  level: config.environment === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'streaming-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class InterviewsStreamingServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.redisClient = null;
    this.dbPool = null;
    this.nms = null;
    this.streamManager = null;
    this.webrtcSignaling = null;
    this.chatManager = null;
    this.analyticsCollector = null;
    this.qualityManager = null;
    this.recordingManager = null;
    this.broadcastingTools = null;
    this.analyticsDashboard = null;
    this.monetizationManager = null;
    this.contentManager = null;
    this.securityManager = null;
    this.privacyManager = null;
    this.securityMonitor = null;
    this.complianceManager = null;
    this.performanceOptimizer = null;
    this.monitoringManager = null;
    this.cdnManager = null;
  }

  async initialize() {
    try {
      logger.info('Initializing Interviews.tv Streaming Server...');
      
      // Initialize database connection
      await this.initializeDatabase();
      
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Initialize core services
      this.initializeServices();
      
      // Setup Node Media Server
      this.setupNodeMediaServer();
      
      // Setup API routes
      this.setupRoutes();
      
      // Setup WebSocket handlers
      this.setupWebSocketHandlers();
      
      logger.info('Streaming server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize streaming server:', error);
      process.exit(1);
    }
  }

  async initializeDatabase() {
    try {
      this.dbPool = mysql.createPool(config.mysqlConfig);
      
      // Test connection
      const connection = await this.dbPool.getConnection();
      await connection.ping();
      connection.release();
      
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      this.redisClient = redis.createClient({
        url: config.redisUrl
      });
      
      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });
      
      await this.redisClient.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  initializeServices() {
    // Initialize core services
    this.streamManager = new StreamManager(this.dbPool, this.redisClient, logger);
    this.webrtcSignaling = new WebRTCSignaling(this.io, logger);
    this.chatManager = new ChatManager(this.io, this.redisClient, logger);
    this.analyticsCollector = new AnalyticsCollector(this.dbPool, this.redisClient, logger);
    this.qualityManager = new QualityManager(logger, this.redisClient);
    this.recordingManager = new RecordingManager(this.dbPool, this.redisClient, logger);
    this.broadcastingTools = new BroadcastingTools(this.io, this.redisClient, logger);
    this.analyticsDashboard = new AnalyticsDashboard(this.dbPool, this.redisClient, logger);
    this.monetizationManager = new MonetizationManager(this.dbPool, this.redisClient, logger);
    this.contentManager = new ContentManager(this.dbPool, this.redisClient, logger);
    this.securityManager = new SecurityManager(this.dbPool, this.redisClient, logger);
    this.privacyManager = new PrivacyManager(this.dbPool, this.redisClient, logger);
    this.securityMonitor = new SecurityMonitor(this.dbPool, this.redisClient, logger);
    this.complianceManager = new ComplianceManager(this.dbPool, this.redisClient, logger);
    this.performanceOptimizer = new PerformanceOptimizer(this.dbPool, this.redisClient, logger);
    this.monitoringManager = new MonitoringManager(this.dbPool, this.redisClient, logger);
    this.cdnManager = new CDNManager(this.dbPool, this.redisClient, logger);

    // Set up service dependencies
    this.analyticsCollector.io = this.io;
  }

  setupNodeMediaServer() {
    const nmsConfig = {
      logType: config.environment === 'production' ? 1 : 3,
      rtmp: {
        port: config.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
      },
      http: {
        port: config.httpPort,
        mediaroot: './media',
        allow_origin: '*'
      },
      relay: {
        ffmpeg: require('ffmpeg-static'),
        tasks: [
          {
            app: 'live',
            mode: 'push',
            edge: 'rtmp://127.0.0.1/live_hls'
          }
        ]
      }
    };

    this.nms = new NodeMediaServer(nmsConfig);
    
    // Setup NMS event handlers
    this.setupNMSEventHandlers();
  }

  setupNMSEventHandlers() {
    this.nms.on('preConnect', (id, args) => {
      logger.debug(`[NodeMediaServer] preConnect id=${id} args=${JSON.stringify(args)}`);
    });

    this.nms.on('postConnect', (id, args) => {
      logger.info(`[NodeMediaServer] postConnect id=${id}`);
    });

    this.nms.on('doneConnect', (id, args) => {
      logger.debug(`[NodeMediaServer] doneConnect id=${id}`);
    });

    this.nms.on('prePublish', async (id, StreamPath, args) => {
      logger.info(`[NodeMediaServer] prePublish id=${id} StreamPath=${StreamPath}`);
      
      try {
        // Extract stream key from path
        const streamKey = StreamPath.split('/').pop();
        
        // Validate stream key and authenticate
        const isValid = await this.streamManager.validateStreamKey(streamKey);
        
        if (!isValid) {
          logger.warn(`[NodeMediaServer] Invalid stream key: ${streamKey}`);
          const session = this.nms.getSession(id);
          session.reject();
          return;
        }
        
        // Start stream session
        await this.streamManager.startStreamSession(streamKey, id);
        
        logger.info(`[NodeMediaServer] Stream started: ${streamKey}`);
      } catch (error) {
        logger.error(`[NodeMediaServer] prePublish error:`, error);
        const session = this.nms.getSession(id);
        session.reject();
      }
    });

    this.nms.on('postPublish', async (id, StreamPath, args) => {
      logger.info(`[NodeMediaServer] postPublish id=${id} StreamPath=${StreamPath}`);

      try {
        const streamKey = StreamPath.split('/').pop();
        await this.streamManager.updateStreamStatus(streamKey, 'live');

        // Initialize adaptive bitrate streaming
        const inputSource = `rtmp://localhost:${config.rtmpPort}${StreamPath}`;
        await this.qualityManager.initializeABR(streamKey, inputSource);

        // Start recording if enabled
        const streamData = await this.streamManager.getStreamByKey(streamKey);
        if (streamData && streamData.recording_enabled) {
          await this.recordingManager.startRecording(streamData.id, streamKey, inputSource);
        }

        // Notify connected clients
        this.io.emit('stream:started', { streamKey, streamPath: StreamPath });
      } catch (error) {
        logger.error(`[NodeMediaServer] postPublish error:`, error);
      }
    });

    this.nms.on('donePublish', async (id, StreamPath, args) => {
      logger.info(`[NodeMediaServer] donePublish id=${id} StreamPath=${StreamPath}`);

      try {
        const streamKey = StreamPath.split('/').pop();

        // Stop adaptive bitrate streaming
        await this.qualityManager.stopABR(streamKey);

        // Stop recording
        const streamData = await this.streamManager.getStreamByKey(streamKey);
        if (streamData) {
          await this.recordingManager.stopRecording(streamData.id);
        }

        // End stream session
        await this.streamManager.endStreamSession(streamKey);

        // Notify connected clients
        this.io.emit('stream:ended', { streamKey, streamPath: StreamPath });
      } catch (error) {
        logger.error(`[NodeMediaServer] donePublish error:`, error);
      }
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        services: {
          database: this.dbPool ? 'connected' : 'disconnected',
          redis: this.redisClient?.isReady ? 'connected' : 'disconnected',
          nodeMediaServer: this.nms ? 'running' : 'stopped'
        }
      });
    });

    // Stream management routes
    this.app.use('/api/streams', require('./src/routes/streamRoutes')(this.streamManager, this.analyticsCollector));

    // Quality management routes
    this.app.use('/api/quality', require('./src/routes/qualityRoutes')(this.qualityManager));

    // Recording management routes
    this.app.use('/api/recordings', require('./src/routes/recordingRoutes')(this.recordingManager));

    // WebRTC signaling routes
    this.app.use('/api/webrtc', require('./src/routes/webrtcRoutes')(this.webrtcSignaling));

    // Chat routes
    this.app.use('/api/chat', require('./src/routes/chatRoutes')(this.chatManager));

    // Analytics routes
    this.app.use('/api/analytics', require('./src/routes/analyticsRoutes')(this.analyticsCollector));

    // Dashboard routes
    this.app.use('/api/dashboard', require('./src/routes/dashboardRoutes')(this.analyticsDashboard));

    // Monetization routes (placeholder - to be implemented)
    // this.app.use('/api/monetization', require('./src/routes/monetizationRoutes')(this.monetizationManager));

    // Content management routes (placeholder - to be implemented)
    // this.app.use('/api/content', require('./src/routes/contentRoutes')(this.contentManager));
  }

  setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.debug(`Client connected: ${socket.id}`);
      
      // WebRTC signaling
      this.webrtcSignaling.handleConnection(socket);
      
      // Chat management
      this.chatManager.handleConnection(socket);
      
      // Analytics tracking
      this.analyticsCollector.handleConnection(socket);

      // Broadcasting tools
      this.broadcastingTools.handleConnection(socket);

      socket.on('disconnect', () => {
        logger.debug(`Client disconnected: ${socket.id}`);

        // Cleanup broadcasting sessions
        this.broadcastingTools.cleanupSession(socket.id);
      });
    });
  }

  async start() {
    try {
      // Start Node Media Server
      this.nms.run();
      logger.info(`Node Media Server started on RTMP port ${config.rtmpPort} and HTTP port ${config.httpPort}`);
      
      // Start Express server
      this.server.listen(config.port, () => {
        logger.info(`Interviews.tv Streaming Server listening on port ${config.port}`);
        logger.info(`Environment: ${config.environment}`);
        logger.info(`RTMP URL: rtmp://localhost:${config.rtmpPort}/live`);
        logger.info(`HLS URL: http://localhost:${config.httpPort}/live/{stream_key}/index.m3u8`);
      });
    } catch (error) {
      logger.error('Failed to start streaming server:', error);
      process.exit(1);
    }
  }

  async stop() {
    logger.info('Shutting down streaming server...');
    
    try {
      // Close Node Media Server
      if (this.nms) {
        this.nms.stop();
      }
      
      // Close database connections
      if (this.dbPool) {
        await this.dbPool.end();
      }
      
      // Close Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      // Close HTTP server
      this.server.close();
      
      logger.info('Streaming server shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Initialize and start server
const streamingServer = new InterviewsStreamingServer();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await streamingServer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await streamingServer.stop();
  process.exit(0);
});

// Start the server
streamingServer.initialize().then(() => {
  streamingServer.start();
}).catch((error) => {
  logger.error('Failed to start streaming server:', error);
  process.exit(1);
});

module.exports = InterviewsStreamingServer;
