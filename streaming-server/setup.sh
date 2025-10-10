#!/bin/bash

# Interviews.tv Live Streaming Server Setup Script
# This script sets up the complete live streaming infrastructure

set -e

echo "🎬 Setting up Interviews.tv Live Streaming Server..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_status "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "npm $(npm --version) is installed"
}

# Check if Redis is running
check_redis() {
    if ! command -v redis-cli &> /dev/null; then
        print_warning "Redis CLI not found. Please install Redis server."
        print_info "On Ubuntu/Debian: sudo apt-get install redis-server"
        print_info "On macOS: brew install redis"
        return 1
    fi
    
    if ! redis-cli ping &> /dev/null; then
        print_warning "Redis server is not running. Please start Redis server."
        print_info "Start Redis: redis-server"
        return 1
    fi
    
    print_status "Redis server is running"
    return 0
}

# Check if MySQL is running
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_warning "MySQL client not found. Please install MySQL server."
        return 1
    fi
    
    print_status "MySQL client is available"
    return 0
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p media
    mkdir -p recordings
    mkdir -p uploads
    mkdir -p src/middleware
    mkdir -p src/routes
    mkdir -p src/services
    mkdir -p tests
    
    print_status "Directories created"
}

# Install Node.js dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."
    
    if [ ! -f package.json ]; then
        print_error "package.json not found. Please run this script from the streaming-server directory."
        exit 1
    fi
    
    npm install
    
    print_status "Dependencies installed successfully"
}

# Create environment file
create_env_file() {
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_status ".env file created"
        print_warning "Please update the .env file with your configuration"
    else
        print_info ".env file already exists"
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Check if the main API database migration exists
    if [ -f "../api/database/migrations/008_create_live_streaming_tables.sql" ]; then
        print_info "Database migration file found"
        print_warning "Please run the migration manually:"
        print_info "mysql -u root -p interviews_tv < ../api/database/migrations/008_create_live_streaming_tables.sql"
    else
        print_warning "Database migration file not found"
    fi
}

# Test the setup
test_setup() {
    print_info "Testing the setup..."
    
    # Test Node.js syntax
    if node -c server.js; then
        print_status "Server.js syntax is valid"
    else
        print_error "Server.js has syntax errors"
        exit 1
    fi
    
    # Test if all required modules can be loaded
    if node -e "require('./src/StreamManager.js'); console.log('StreamManager loaded successfully')"; then
        print_status "StreamManager module loads correctly"
    else
        print_error "StreamManager module has issues"
        exit 1
    fi
    
    if node -e "require('./src/WebRTCSignaling.js'); console.log('WebRTCSignaling loaded successfully')"; then
        print_status "WebRTCSignaling module loads correctly"
    else
        print_error "WebRTCSignaling module has issues"
        exit 1
    fi
}

# Create systemd service file (optional)
create_systemd_service() {
    if [ "$1" = "--systemd" ]; then
        print_info "Creating systemd service file..."
        
        cat > interviews-tv-streaming.service << EOF
[Unit]
Description=Interviews.tv Live Streaming Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=interviews-tv-streaming

[Install]
WantedBy=multi-user.target
EOF
        
        print_status "Systemd service file created: interviews-tv-streaming.service"
        print_info "To install: sudo cp interviews-tv-streaming.service /etc/systemd/system/"
        print_info "To enable: sudo systemctl enable interviews-tv-streaming"
        print_info "To start: sudo systemctl start interviews-tv-streaming"
    fi
}

# Main setup function
main() {
    echo
    print_info "Starting setup process..."
    echo
    
    # Check prerequisites
    check_nodejs
    check_npm
    
    # Create directories
    create_directories
    
    # Install dependencies
    install_dependencies
    
    # Create environment file
    create_env_file
    
    # Check optional services
    REDIS_OK=0
    MYSQL_OK=0
    
    if check_redis; then
        REDIS_OK=1
    fi
    
    if check_mysql; then
        MYSQL_OK=1
    fi
    
    # Run migrations
    run_migrations
    
    # Test setup
    test_setup
    
    # Create systemd service if requested
    create_systemd_service "$1"
    
    echo
    print_status "Setup completed successfully! 🎉"
    echo
    
    # Print next steps
    echo "📋 Next Steps:"
    echo "=============="
    echo
    
    if [ $REDIS_OK -eq 0 ]; then
        print_warning "1. Install and start Redis server"
    fi
    
    if [ $MYSQL_OK -eq 0 ]; then
        print_warning "2. Install and configure MySQL server"
    fi
    
    echo "3. Update the .env file with your configuration"
    echo "4. Run database migrations"
    echo "5. Start the streaming server:"
    echo "   npm start (for production)"
    echo "   npm run dev (for development)"
    echo
    
    print_info "Server will be available at:"
    echo "   - API: http://localhost:8081"
    echo "   - RTMP: rtmp://localhost:1935/live"
    echo "   - HLS: http://localhost:8080/live/{stream_key}/index.m3u8"
    echo
    
    print_info "For more information, check the documentation in the README.md file"
}

# Run main function
main "$@"
