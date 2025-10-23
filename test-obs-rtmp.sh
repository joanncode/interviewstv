#!/bin/bash

# Test OBS Studio RTMP Streaming Setup
# This script launches OBS Studio with the correct PATH and provides RTMP configuration

echo "🎥 OBS Studio RTMP Test Setup"
echo "================================"
echo ""
echo "✅ OBS Studio Version: $(export PATH=$PATH:/snap/bin && obs-studio --version 2>/dev/null | grep 'OBS Studio')"
echo ""
echo "🔧 RTMP Configuration:"
echo "   Server URL: rtmp://localhost:1935/live"
echo "   Stream Key: test-stream-key"
echo ""
echo "📋 Setup Instructions:"
echo "1. OBS will launch in a moment"
echo "2. Go to Settings > Stream"
echo "3. Set Service to 'Custom'"
echo "4. Set Server to: rtmp://localhost:1935/live"
echo "5. Set Stream Key to: test-stream-key"
echo "6. Click OK and start streaming!"
echo ""
echo "🎯 Test URLs:"
echo "   RTMP Test Interface: http://localhost:8000/rtmp-test-setup.html"
echo "   HLS Output: http://localhost:8080/live/test-stream-key/index.m3u8"
echo ""
echo "Press Enter to launch OBS Studio..."
read

# Add snap bin to PATH and launch OBS
export PATH=$PATH:/snap/bin
echo "🚀 Launching OBS Studio..."
obs-studio
