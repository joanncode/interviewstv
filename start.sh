#!/bin/bash

# Interviews.tv Startup Script
# This script helps you get the platform running quickly

echo "🎬 Starting Interviews.tv Platform..."
echo "=================================="

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo "❌ PHP is not installed. Please install PHP 8.0 or higher."
    exit 1
fi

echo "✓ PHP is installed"

# Check if MariaDB/MySQL is running
if ! command -v mysql &> /dev/null && ! command -v mariadb &> /dev/null; then
    echo "⚠️  MySQL/MariaDB command not found. Please ensure it's installed and running."
else
    echo "✓ MySQL/MariaDB is available"
fi

# Set up database if setup.php exists
if [ -f "setup.php" ]; then
    echo ""
    echo "📋 Setting up database..."
    php setup.php
    
    if [ $? -eq 0 ]; then
        echo "✓ Database setup completed"
    else
        echo "❌ Database setup failed. Please check your MySQL/MariaDB connection."
        echo "   Make sure MySQL/MariaDB is running and accessible."
        exit 1
    fi
else
    echo "⚠️  setup.php not found. Skipping database setup."
fi

echo ""
echo "🚀 Starting servers..."

# Start API server in background
echo "Starting API server on port 8001..."
php -S localhost:8001 -t api/ > api_server.log 2>&1 &
API_PID=$!

# Wait a moment for API server to start
sleep 2

# Check if API server started successfully
if kill -0 $API_PID 2>/dev/null; then
    echo "✓ API server started (PID: $API_PID)"
else
    echo "❌ Failed to start API server"
    exit 1
fi

# Start web server in background
echo "Starting web server on port 8000..."
php -S localhost:8000 -t web/public/ > web_server.log 2>&1 &
WEB_PID=$!

# Wait a moment for web server to start
sleep 2

# Check if web server started successfully
if kill -0 $WEB_PID 2>/dev/null; then
    echo "✓ Web server started (PID: $WEB_PID)"
else
    echo "❌ Failed to start web server"
    kill $API_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Interviews.tv is now running!"
echo "================================"
echo ""
echo "📱 Frontend: http://localhost:8000"
echo "🔧 API:      http://localhost:8001/api"
echo ""
echo "🔐 Login Credentials:"
echo "   Admin:    admin@interviews.tv    / admin123"
echo "   Creator:  creator@interviews.tv  / creator123"
echo "   Business: business@interviews.tv / business123"
echo "   User:     user@interviews.tv     / user123"
echo ""
echo "🛠️  Admin Panel: http://localhost:8000/admin"
echo ""
echo "📝 Logs:"
echo "   API Server: api_server.log"
echo "   Web Server: web_server.log"
echo ""
echo "To stop the servers, press Ctrl+C or run:"
echo "   kill $API_PID $WEB_PID"
echo ""

# Save PIDs to file for easy cleanup
echo "$API_PID" > .api_pid
echo "$WEB_PID" > .web_pid

# Wait for user to stop
echo "Press Ctrl+C to stop the servers..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $API_PID 2>/dev/null && echo "✓ API server stopped"
    kill $WEB_PID 2>/dev/null && echo "✓ Web server stopped"
    rm -f .api_pid .web_pid
    echo "👋 Goodbye!"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    # Check if servers are still running
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "❌ API server stopped unexpectedly"
        break
    fi
    
    if ! kill -0 $WEB_PID 2>/dev/null; then
        echo "❌ Web server stopped unexpectedly"
        break
    fi
    
    sleep 5
done

cleanup
