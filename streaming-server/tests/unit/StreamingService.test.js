/**
 * Unit Tests for StreamingService
 * 
 * Tests:
 * - Stream creation and management
 * - WebRTC connection handling
 * - Quality adaptation
 * - Error handling
 * - Session management
 * - Media processing
 */

const { describe, it, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const StreamManager = require('../../src/StreamManager');
const WebRTCSignaling = require('../../src/WebRTCSignaling');
const QualityManager = require('../../src/QualityManager');

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('redis');
jest.mock('winston');

describe('StreamManager', () => {
  let streamManager;
  let mockDbPool;
  let mockRedisClient;
  let mockLogger;

  beforeEach(() => {
    mockDbPool = {
      execute: jest.fn(),
      getConnection: jest.fn()
    };
    
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    streamManager = new StreamManager(mockDbPool, mockRedisClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStream', () => {
    it('should create a new stream successfully', async () => {
      const streamData = {
        userId: 1,
        title: 'Test Stream',
        description: 'Test Description',
        category: 'technology',
        isPrivate: false
      };

      const mockStreamId = 'stream_123';
      const mockStreamKey = 'sk_test_key';

      mockDbPool.execute.mockResolvedValueOnce([{ insertId: 1 }]);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await streamManager.createStream(streamData);

      expect(result).toHaveProperty('streamId');
      expect(result).toHaveProperty('streamKey');
      expect(result.success).toBe(true);
      expect(mockDbPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO live_streams'),
        expect.arrayContaining([streamData.userId, streamData.title])
      );
    });

    it('should handle database errors gracefully', async () => {
      const streamData = {
        userId: 1,
        title: 'Test Stream'
      };

      mockDbPool.execute.mockRejectedValueOnce(new Error('Database error'));

      await expect(streamManager.createStream(streamData)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidStreamData = {
        title: 'Test Stream'
        // Missing userId
      };

      await expect(streamManager.createStream(invalidStreamData)).rejects.toThrow('User ID is required');
    });
  });

  describe('startStream', () => {
    it('should start a stream successfully', async () => {
      const streamId = 'stream_123';
      const userId = 1;

      mockDbPool.execute.mockResolvedValueOnce([[]]);
      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.publish.mockResolvedValue(1);

      const result = await streamManager.startStream(streamId, userId);

      expect(result.success).toBe(true);
      expect(mockDbPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE live_streams SET status = ?'),
        ['live', expect.any(String), streamId, userId]
      );
    });

    it('should prevent unauthorized stream start', async () => {
      const streamId = 'stream_123';
      const unauthorizedUserId = 999;

      mockDbPool.execute.mockResolvedValueOnce([[]]);

      await expect(streamManager.startStream(streamId, unauthorizedUserId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('stopStream', () => {
    it('should stop a stream successfully', async () => {
      const streamId = 'stream_123';
      const userId = 1;

      mockDbPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockRedisClient.hdel.mockResolvedValue(1);
      mockRedisClient.publish.mockResolvedValue(1);

      const result = await streamManager.stopStream(streamId, userId);

      expect(result.success).toBe(true);
      expect(mockDbPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE live_streams SET status = ?'),
        ['ended', expect.any(String), streamId, userId]
      );
    });
  });

  describe('getStreamInfo', () => {
    it('should retrieve stream information', async () => {
      const streamId = 'stream_123';
      const mockStreamData = {
        id: streamId,
        title: 'Test Stream',
        status: 'live',
        viewer_count: 150
      };

      mockDbPool.execute.mockResolvedValueOnce([[mockStreamData]]);
      mockRedisClient.hget.mockResolvedValue('150');

      const result = await streamManager.getStreamInfo(streamId);

      expect(result).toEqual(expect.objectContaining({
        id: streamId,
        title: 'Test Stream',
        status: 'live'
      }));
    });

    it('should return null for non-existent stream', async () => {
      const streamId = 'nonexistent_stream';

      mockDbPool.execute.mockResolvedValueOnce([[]]);

      const result = await streamManager.getStreamInfo(streamId);

      expect(result).toBeNull();
    });
  });
});

describe('WebRTCSignaling', () => {
  let webrtcSignaling;
  let mockIo;
  let mockLogger;

  beforeEach(() => {
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    webrtcSignaling = new WebRTCSignaling(mockIo, mockLogger);
  });

  describe('handleOffer', () => {
    it('should process WebRTC offer correctly', async () => {
      const mockSocket = {
        id: 'socket_123',
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn()
      };

      const offerData = {
        streamId: 'stream_123',
        offer: {
          type: 'offer',
          sdp: 'mock_sdp_data'
        }
      };

      await webrtcSignaling.handleOffer(mockSocket, offerData);

      expect(mockSocket.join).toHaveBeenCalledWith('stream_123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('WebRTC offer processed')
      );
    });

    it('should validate offer data', async () => {
      const mockSocket = {
        id: 'socket_123',
        emit: jest.fn()
      };

      const invalidOfferData = {
        streamId: 'stream_123'
        // Missing offer
      };

      await expect(webrtcSignaling.handleOffer(mockSocket, invalidOfferData))
        .rejects.toThrow('Invalid offer data');
    });
  });

  describe('handleAnswer', () => {
    it('should process WebRTC answer correctly', async () => {
      const mockSocket = {
        id: 'socket_123',
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      const answerData = {
        streamId: 'stream_123',
        answer: {
          type: 'answer',
          sdp: 'mock_sdp_data'
        }
      };

      await webrtcSignaling.handleAnswer(mockSocket, answerData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('WebRTC answer processed')
      );
    });
  });

  describe('handleIceCandidate', () => {
    it('should relay ICE candidates correctly', async () => {
      const mockSocket = {
        id: 'socket_123',
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      const candidateData = {
        streamId: 'stream_123',
        candidate: {
          candidate: 'candidate:mock_candidate',
          sdpMLineIndex: 0,
          sdpMid: 'video'
        }
      };

      await webrtcSignaling.handleIceCandidate(mockSocket, candidateData);

      expect(mockSocket.to).toHaveBeenCalledWith('stream_123');
      expect(mockSocket.emit).toHaveBeenCalledWith('ice-candidate', candidateData);
    });
  });
});

describe('QualityManager', () => {
  let qualityManager;
  let mockLogger;
  let mockRedisClient;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn()
    };

    qualityManager = new QualityManager(mockLogger, mockRedisClient);
  });

  describe('adaptQuality', () => {
    it('should adapt quality based on network conditions', async () => {
      const streamId = 'stream_123';
      const networkInfo = {
        bandwidth: 1500000, // 1.5 Mbps
        latency: 50,
        packetLoss: 0.01
      };

      mockRedisClient.hget.mockResolvedValue('720p');
      mockRedisClient.hset.mockResolvedValue(1);

      const result = await qualityManager.adaptQuality(streamId, networkInfo);

      expect(result).toHaveProperty('recommendedQuality');
      expect(result).toHaveProperty('reason');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Quality adapted')
      );
    });

    it('should handle poor network conditions', async () => {
      const streamId = 'stream_123';
      const poorNetworkInfo = {
        bandwidth: 300000, // 300 Kbps
        latency: 200,
        packetLoss: 0.05
      };

      const result = await qualityManager.adaptQuality(streamId, poorNetworkInfo);

      expect(result.recommendedQuality).toBe('240p');
      expect(result.reason).toContain('poor network');
    });
  });

  describe('getQualityPresets', () => {
    it('should return available quality presets', () => {
      const presets = qualityManager.getQualityPresets();

      expect(presets).toHaveProperty('240p');
      expect(presets).toHaveProperty('360p');
      expect(presets).toHaveProperty('480p');
      expect(presets).toHaveProperty('720p');
      expect(presets).toHaveProperty('1080p');

      expect(presets['720p']).toHaveProperty('resolution');
      expect(presets['720p']).toHaveProperty('videoBitrate');
      expect(presets['720p']).toHaveProperty('audioBitrate');
    });
  });

  describe('validateQuality', () => {
    it('should validate supported quality settings', () => {
      expect(qualityManager.validateQuality('720p')).toBe(true);
      expect(qualityManager.validateQuality('1080p')).toBe(true);
      expect(qualityManager.validateQuality('4k')).toBe(false);
      expect(qualityManager.validateQuality('invalid')).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  let streamManager;
  let mockDbPool;
  let mockRedisClient;
  let mockLogger;

  beforeEach(() => {
    mockDbPool = {
      execute: jest.fn()
    };
    
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    streamManager = new StreamManager(mockDbPool, mockRedisClient, mockLogger);
  });

  it('should handle database connection failures', async () => {
    mockDbPool.execute.mockRejectedValue(new Error('Connection timeout'));

    await expect(streamManager.getStreamInfo('stream_123'))
      .rejects.toThrow('Connection timeout');
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Database error'),
      expect.any(Error)
    );
  });

  it('should handle Redis connection failures', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis connection lost'));

    // Should not throw but should log error
    const result = await streamManager.getViewerCount('stream_123');
    
    expect(result).toBe(0); // Default fallback
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Redis error'),
      expect.any(Error)
    );
  });

  it('should handle invalid input gracefully', async () => {
    await expect(streamManager.createStream(null))
      .rejects.toThrow('Invalid stream data');
    
    await expect(streamManager.createStream({}))
      .rejects.toThrow('User ID is required');
    
    await expect(streamManager.createStream({ userId: 'invalid' }))
      .rejects.toThrow('Invalid user ID');
  });
});

describe('Performance Tests', () => {
  let streamManager;
  let mockDbPool;
  let mockRedisClient;
  let mockLogger;

  beforeEach(() => {
    mockDbPool = {
      execute: jest.fn().mockResolvedValue([[]]),
      getConnection: jest.fn()
    };
    
    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      hget: jest.fn().mockResolvedValue('0'),
      hset: jest.fn().mockResolvedValue(1)
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    streamManager = new StreamManager(mockDbPool, mockRedisClient, mockLogger);
  });

  it('should handle concurrent stream operations', async () => {
    const concurrentOperations = Array.from({ length: 100 }, (_, i) => 
      streamManager.getStreamInfo(`stream_${i}`)
    );

    const startTime = Date.now();
    await Promise.all(concurrentOperations);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    expect(mockDbPool.execute).toHaveBeenCalledTimes(100);
  });

  it('should cache frequently accessed data', async () => {
    const streamId = 'popular_stream';
    
    // First call should hit database
    await streamManager.getStreamInfo(streamId);
    expect(mockDbPool.execute).toHaveBeenCalledTimes(1);
    
    // Subsequent calls should use cache
    mockRedisClient.get.mockResolvedValue(JSON.stringify({
      id: streamId,
      title: 'Cached Stream',
      status: 'live'
    }));
    
    await streamManager.getStreamInfo(streamId);
    await streamManager.getStreamInfo(streamId);
    
    // Database should only be called once
    expect(mockDbPool.execute).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.get).toHaveBeenCalledTimes(3); // Called for each request
  });
});
