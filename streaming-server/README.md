# Interviews.tv Live Streaming Server

A professional-grade live streaming media server built for the Interviews.tv platform, supporting real-time interview broadcasting with WebRTC, RTMP ingestion, HLS delivery, and comprehensive analytics.

## 🎯 Features

### Core Streaming
- **RTMP Ingestion**: Accept streams from OBS, FFmpeg, and other broadcasting software
- **HLS/DASH Output**: Deliver streams to web browsers and mobile apps
- **WebRTC Support**: Low-latency browser-to-browser streaming
- **Multi-Quality Streaming**: Adaptive bitrate streaming (360p to 1080p)
- **Recording**: Automatic stream recording with cloud storage integration

### Real-time Features
- **Live Chat**: Real-time messaging with moderation tools
- **Viewer Analytics**: Real-time viewer count and engagement metrics
- **Stream Statistics**: Comprehensive analytics and performance monitoring
- **Interactive Elements**: Reactions, polls, and viewer engagement tools

### Management & Security
- **Stream Authentication**: Secure stream key validation
- **User Management**: Role-based access control for streamers and moderators
- **Content Moderation**: Automated and manual content moderation tools
- **Rate Limiting**: Protection against abuse and spam

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Broadcasting  │    │   Media Server  │    │    Viewers      │
│   Software      │───▶│   (Node.js)     │───▶│   (Web/Mobile)  │
│   (OBS/FFmpeg)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (MySQL)       │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache         │
                       │   (Redis)       │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **MySQL 8.0+**
- **Redis 6.0+**
- **FFmpeg** (for video processing)

### Installation

1. **Clone and setup**:
   ```bash
   cd streaming-server
   ./setup.sh
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations**:
   ```bash
   mysql -u root -p interviews_tv < ../api/database/migrations/008_create_live_streaming_tables.sql
   ```

4. **Start the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📡 API Endpoints

### Stream Management
```
POST   /api/streams           - Create new stream
GET    /api/streams/:id       - Get stream details
PUT    /api/streams/:id       - Update stream
DELETE /api/streams/:id       - Delete stream
POST   /api/streams/:id/start - Start stream
POST   /api/streams/:id/stop  - Stop stream
GET    /api/streams/live      - List active streams
GET    /api/streams/:id/stats - Get stream statistics
```

### WebRTC Signaling
```
WebSocket Events:
- webrtc:join-stream
- webrtc:leave-stream
- webrtc:offer
- webrtc:answer
- webrtc:ice-candidate
- webrtc:connection-state
```

### Chat & Analytics
```
POST   /api/chat/:streamId/message  - Send chat message
GET    /api/chat/:streamId          - Get chat history
GET    /api/analytics/:streamId     - Get stream analytics
```

## 🎬 Broadcasting Setup

### Using OBS Studio

1. **Stream Settings**:
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: Get from API `/api/streams` endpoint

2. **Recommended Settings**:
   - **Video Bitrate**: 2500 kbps (720p) / 4500 kbps (1080p)
   - **Audio Bitrate**: 128 kbps
   - **Keyframe Interval**: 2 seconds
   - **Encoder**: x264

### Using FFmpeg

```bash
ffmpeg -f v4l2 -i /dev/video0 -f alsa -i default \
  -c:v libx264 -preset veryfast -b:v 2500k \
  -c:a aac -b:a 128k \
  -f flv rtmp://localhost:1935/live/YOUR_STREAM_KEY
```

## 🌐 Viewing Streams

### Web Browser (HLS)
```
http://localhost:8080/live/{stream_key}/index.m3u8
```

### WebRTC (Low Latency)
```javascript
// Connect to WebSocket
const socket = io('http://localhost:8081');

// Join stream
socket.emit('webrtc:join-stream', {
  streamId: 'stream-id',
  userId: 'user-id',
  role: 'viewer'
});
```

## 📊 Monitoring & Analytics

### Health Check
```bash
curl http://localhost:8081/health
```

### Stream Statistics
```bash
curl http://localhost:8081/api/streams/live
```

### Real-time Metrics
- Current viewer count
- Stream quality metrics
- Chat activity
- Connection statistics

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Server Configuration
STREAMING_PORT=8081
RTMP_PORT=1935
HTTP_PORT=8080

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=interviews_tv

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key

# Streaming
MAX_STREAMS_PER_USER=3
DEFAULT_QUALITY=720p
ENABLE_RECORDING=true
```

### Quality Presets

```bash
# Video encoding presets
PRESET_360P="-vf scale=640:360 -b:v 800k -b:a 96k"
PRESET_480P="-vf scale=854:480 -b:v 1200k -b:a 128k"
PRESET_720P="-vf scale=1280:720 -b:v 2500k -b:a 128k"
PRESET_1080P="-vf scale=1920:1080 -b:v 4500k -b:a 192k"
```

## 🔒 Security

### Authentication
- JWT token-based authentication
- Stream key validation
- Role-based access control

### Rate Limiting
- API request limiting
- Chat message rate limiting
- Connection throttling

### Content Protection
- Stream encryption
- CORS protection
- Input validation and sanitization

## 📈 Performance

### Optimization
- Redis caching for session data
- Database connection pooling
- Efficient WebSocket handling
- CDN integration support

### Scaling
- Horizontal scaling with load balancers
- Microservices architecture ready
- Cloud storage integration
- Auto-scaling configuration

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Load Testing
```bash
# Test concurrent connections
npm run test:load
```

### Integration Tests
```bash
npm run test:integration
```

## 📝 Development

### Project Structure
```
streaming-server/
├── src/
│   ├── StreamManager.js      # Core stream management
│   ├── WebRTCSignaling.js    # WebRTC signaling server
│   ├── ChatManager.js        # Live chat functionality
│   ├── AnalyticsCollector.js # Analytics and metrics
│   ├── routes/               # API route handlers
│   ├── middleware/           # Express middleware
│   └── services/             # Business logic services
├── logs/                     # Application logs
├── media/                    # Stream media files
├── recordings/               # Stream recordings
├── tests/                    # Test files
├── server.js                 # Main server file
├── package.json              # Dependencies
└── .env                      # Configuration
```

### Adding New Features

1. **Create service module** in `src/services/`
2. **Add API routes** in `src/routes/`
3. **Update database schema** if needed
4. **Add tests** in `tests/`
5. **Update documentation**

## 🚨 Troubleshooting

### Common Issues

**Stream not starting**:
- Check stream key validity
- Verify RTMP port accessibility
- Check FFmpeg installation

**High latency**:
- Use WebRTC for low latency
- Optimize network configuration
- Check server resources

**Connection issues**:
- Verify firewall settings
- Check STUN/TURN server configuration
- Monitor network bandwidth

### Logs

```bash
# View application logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log

# View Node Media Server logs
tail -f logs/nms.log
```

## 📞 Support

For issues and questions:
- Check the [troubleshooting guide](#troubleshooting)
- Review server logs
- Check the [API documentation](#api-endpoints)
- Open an issue on GitHub

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Interviews.tv platform**
