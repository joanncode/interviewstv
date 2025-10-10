/**
 * Integration Tests for Streaming Pipeline
 * 
 * Tests:
 * - End-to-end streaming workflow
 * - WebRTC connection establishment
 * - RTMP ingestion to HLS delivery
 * - Real-time chat integration
 * - Analytics data flow
 * - Cross-service communication
 * - Database and Redis integration
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } = require('@jest/globals');
const request = require('supertest');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const Redis = require('redis');
const app = require('../../server');

// Test configuration
const TEST_CONFIG = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'interviews_tv_test'
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: process.env.TEST_REDIS_PORT || 6379,
    db: process.env.TEST_REDIS_DB || 1
  },
  server: {
    port: process.env.TEST_PORT || 3001,
    host: process.env.TEST_HOST || 'localhost'
  }
};

describe('Streaming Pipeline Integration Tests', () => {
  let dbConnection;
  let redisClient;
  let server;
  let authToken;
  let testUserId;
  let testStreamId;

  beforeAll(async () => {
    // Set up test database connection
    dbConnection = await mysql.createConnection(TEST_CONFIG.database);
    
    // Set up Redis connection
    redisClient = Redis.createClient(TEST_CONFIG.redis);
    await redisClient.connect();
    
    // Start test server
    server = app.listen(TEST_CONFIG.server.port);
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_streamer',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Streamer'
      });
    
    testUserId = userResponse.body.user.id;
    authToken = userResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    if (dbConnection) {
      await dbConnection.execute('DELETE FROM live_streams WHERE user_id = ?', [testUserId]);
      await dbConnection.execute('DELETE FROM users WHERE id = ?', [testUserId]);
      await dbConnection.end();
    }
    
    if (redisClient) {
      await redisClient.flushDb();
      await redisClient.disconnect();
    }
    
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clear Redis cache before each test
    await redisClient.flushDb();
  });

  describe('Stream Creation and Management', () => {
    it('should create a stream and store in database', async () => {
      const streamData = {
        title: 'Integration Test Stream',
        description: 'Testing the complete streaming pipeline',
        category: 'technology',
        isPrivate: false
      };

      const response = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(streamData)
        .expect(201);

      expect(response.body).toHaveProperty('streamId');
      expect(response.body).toHaveProperty('streamKey');
      expect(response.body.success).toBe(true);

      testStreamId = response.body.streamId;

      // Verify stream exists in database
      const [rows] = await dbConnection.execute(
        'SELECT * FROM live_streams WHERE id = ?',
        [testStreamId]
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe(streamData.title);
      expect(rows[0].user_id).toBe(testUserId);
      expect(rows[0].status).toBe('created');
    });

    it('should start stream and update status', async () => {
      // Create stream first
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Stream for Starting',
          category: 'technology'
        });

      const streamId = createResponse.body.streamId;

      // Start the stream
      const startResponse = await request(app)
        .post(`/api/streams/${streamId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startResponse.body.success).toBe(true);

      // Verify status in database
      const [rows] = await dbConnection.execute(
        'SELECT status, started_at FROM live_streams WHERE id = ?',
        [streamId]
      );

      expect(rows[0].status).toBe('live');
      expect(rows[0].started_at).not.toBeNull();

      // Verify stream is cached in Redis
      const cachedStream = await redisClient.hGet(`stream:${streamId}`, 'status');
      expect(cachedStream).toBe('live');
    });

    it('should stop stream and clean up resources', async () => {
      // Create and start stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Stream for Stopping',
          category: 'technology'
        });

      const streamId = createResponse.body.streamId;

      await request(app)
        .post(`/api/streams/${streamId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      // Stop the stream
      const stopResponse = await request(app)
        .post(`/api/streams/${streamId}/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(stopResponse.body.success).toBe(true);

      // Verify status in database
      const [rows] = await dbConnection.execute(
        'SELECT status, ended_at FROM live_streams WHERE id = ?',
        [streamId]
      );

      expect(rows[0].status).toBe('ended');
      expect(rows[0].ended_at).not.toBeNull();

      // Verify Redis cleanup
      const cachedStream = await redisClient.hGet(`stream:${streamId}`, 'status');
      expect(cachedStream).toBeNull();
    });
  });

  describe('WebRTC Signaling Integration', () => {
    let wsClient;
    let streamId;

    beforeEach(async () => {
      // Create a test stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'WebRTC Test Stream',
          category: 'technology'
        });

      streamId = createResponse.body.streamId;

      // Connect WebSocket client
      wsClient = new WebSocket(`ws://localhost:${TEST_CONFIG.server.port}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      await new Promise((resolve) => {
        wsClient.on('open', resolve);
      });
    });

    afterEach(async () => {
      if (wsClient) {
        wsClient.close();
      }
    });

    it('should handle WebRTC offer and generate answer', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 123456789 IN IP4 127.0.0.1\r\n...'
      };

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'stream-answer') {
          expect(message).toHaveProperty('answer');
          expect(message.answer).toHaveProperty('type', 'answer');
          expect(message.answer).toHaveProperty('sdp');
          done();
        }
      });

      // Send offer
      wsClient.send(JSON.stringify({
        type: 'start-stream',
        streamId: streamId,
        offer: mockOffer
      }));
    });

    it('should relay ICE candidates between peers', (done) => {
      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: 'video'
      };

      let candidateReceived = false;

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'ice-candidate') {
          expect(message).toHaveProperty('candidate');
          expect(message.candidate.candidate).toBe(mockCandidate.candidate);
          candidateReceived = true;
          done();
        }
      });

      // Join stream room first
      wsClient.send(JSON.stringify({
        type: 'join-stream',
        streamId: streamId
      }));

      // Send ICE candidate after a short delay
      setTimeout(() => {
        wsClient.send(JSON.stringify({
          type: 'ice-candidate',
          streamId: streamId,
          candidate: mockCandidate
        }));
      }, 100);
    });
  });

  describe('Real-time Chat Integration', () => {
    let wsClient;
    let streamId;

    beforeEach(async () => {
      // Create and start a test stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Chat Test Stream',
          category: 'technology'
        });

      streamId = createResponse.body.streamId;

      await request(app)
        .post(`/api/streams/${streamId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      // Connect WebSocket client
      wsClient = new WebSocket(`ws://localhost:${TEST_CONFIG.server.port}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      await new Promise((resolve) => {
        wsClient.on('open', resolve);
      });

      // Join stream
      wsClient.send(JSON.stringify({
        type: 'join-stream',
        streamId: streamId
      }));
    });

    afterEach(async () => {
      if (wsClient) {
        wsClient.close();
      }
    });

    it('should send and receive chat messages', (done) => {
      const testMessage = {
        text: 'Hello from integration test!',
        timestamp: Date.now()
      };

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'chat-message') {
          expect(message.data.text).toBe(testMessage.text);
          expect(message.data.username).toBe('test_streamer');
          expect(message.data.streamId).toBe(streamId);
          done();
        }
      });

      // Send chat message
      wsClient.send(JSON.stringify({
        type: 'chat-message',
        streamId: streamId,
        message: testMessage.text
      }));
    });

    it('should store chat messages in database', async () => {
      const testMessage = 'This message should be stored in database';

      // Send message via WebSocket
      wsClient.send(JSON.stringify({
        type: 'chat-message',
        streamId: streamId,
        message: testMessage
      }));

      // Wait for message to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check database
      const [rows] = await dbConnection.execute(
        'SELECT * FROM stream_chat WHERE stream_id = ? AND message = ?',
        [streamId, testMessage]
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(testUserId);
      expect(rows[0].message).toBe(testMessage);
    });
  });

  describe('Analytics Integration', () => {
    let streamId;

    beforeEach(async () => {
      // Create and start a test stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Analytics Test Stream',
          category: 'technology'
        });

      streamId = createResponse.body.streamId;

      await request(app)
        .post(`/api/streams/${streamId}/start`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should track viewer join events', async () => {
      // Simulate viewer joining
      const response = await request(app)
        .post(`/api/streams/${streamId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check analytics data
      const [rows] = await dbConnection.execute(
        'SELECT * FROM stream_analytics WHERE stream_id = ? AND event_type = ?',
        [streamId, 'viewer_join']
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].user_id).toBe(testUserId);
    });

    it('should update viewer count in real-time', async () => {
      // Initial viewer count should be 0
      let response = await request(app)
        .get(`/api/streams/${streamId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.viewerCount).toBe(0);

      // Simulate multiple viewers joining
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/streams/${streamId}/join`)
          .set('Authorization', `Bearer ${authToken}`);
      }

      // Check updated viewer count
      response = await request(app)
        .get(`/api/streams/${streamId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.viewerCount).toBe(5);

      // Verify Redis cache
      const cachedCount = await redisClient.hGet(`stream:${streamId}`, 'viewer_count');
      expect(parseInt(cachedCount)).toBe(5);
    });
  });

  describe('Cross-Service Communication', () => {
    it('should handle monetization events', async () => {
      // Create stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Monetization Test Stream',
          category: 'technology'
        });

      const streamId = createResponse.body.streamId;

      // Start stream
      await request(app)
        .post(`/api/streams/${streamId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      // Send virtual gift
      const giftResponse = await request(app)
        .post(`/api/monetization/gift`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          streamId: streamId,
          giftType: 'heart',
          amount: 1,
          message: 'Great stream!'
        })
        .expect(200);

      expect(giftResponse.body.success).toBe(true);

      // Verify gift is recorded in database
      const [giftRows] = await dbConnection.execute(
        'SELECT * FROM virtual_gifts WHERE stream_id = ?',
        [streamId]
      );

      expect(giftRows).toHaveLength(1);
      expect(giftRows[0].gift_type).toBe('heart');
      expect(giftRows[0].sender_id).toBe(testUserId);

      // Verify analytics event is created
      const [analyticsRows] = await dbConnection.execute(
        'SELECT * FROM stream_analytics WHERE stream_id = ? AND event_type = ?',
        [streamId, 'gift_received']
      );

      expect(analyticsRows).toHaveLength(1);
    });

    it('should handle content moderation workflow', async () => {
      // Create stream
      const createResponse = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Moderation Test Stream',
          category: 'technology'
        });

      const streamId = createResponse.body.streamId;

      // Report inappropriate content
      const reportResponse = await request(app)
        .post(`/api/moderation/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          streamId: streamId,
          reason: 'inappropriate_content',
          description: 'Test report for integration testing'
        })
        .expect(200);

      expect(reportResponse.body.success).toBe(true);

      // Verify report is stored
      const [reportRows] = await dbConnection.execute(
        'SELECT * FROM content_reports WHERE stream_id = ?',
        [streamId]
      );

      expect(reportRows).toHaveLength(1);
      expect(reportRows[0].reason).toBe('inappropriate_content');
      expect(reportRows[0].reporter_id).toBe(testUserId);
      expect(reportRows[0].status).toBe('pending');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Temporarily close database connection
      await dbConnection.end();

      // Attempt to create stream (should fail gracefully)
      const response = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Stream',
          category: 'technology'
        })
        .expect(500);

      expect(response.body.error).toContain('database');

      // Restore connection for cleanup
      dbConnection = await mysql.createConnection(TEST_CONFIG.database);
    });

    it('should handle Redis connection failures gracefully', async () => {
      // Disconnect Redis
      await redisClient.disconnect();

      // Operations should still work but without caching
      const response = await request(app)
        .post('/api/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Stream Without Redis',
          category: 'technology'
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Reconnect Redis for cleanup
      redisClient = Redis.createClient(TEST_CONFIG.redis);
      await redisClient.connect();
    });
  });
});
