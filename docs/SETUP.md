# Interviews.tv Development Setup Guide

This guide will help you set up the Interviews.tv platform for local development. Follow these steps to get your development environment running quickly.

## 📋 Prerequisites

### Required Software
- **PHP 8.1+** with extensions:
  - PDO MySQL
  - OpenSSL
  - Mbstring
  - JSON
  - Curl
  - GD or Imagick
- **Node.js 18+** and npm
- **MySQL 8.0+** or MariaDB 10.6+
- **Composer** (PHP dependency manager)
- **Git**

### Optional but Recommended
- **Docker** and Docker Compose
- **Redis** (for caching and sessions)
- **FFmpeg** (for video processing)

## 🚀 Quick Start (Docker)

The fastest way to get started is using Docker:

```bash
# Clone the repository
git clone https://github.com/interviews-tv/platform.git
cd platform

# Copy environment file
cp .env.example .env

# Start the development environment
docker-compose up -d

# Install dependencies
docker-compose exec app composer install
docker-compose exec app npm install

# Run database migrations
docker-compose exec app php artisan migrate

# Seed the database (optional)
docker-compose exec app php artisan db:seed

# Build frontend assets
docker-compose exec app npm run dev
```

Your application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Database**: localhost:3306
- **Redis**: localhost:6379

## 🛠️ Manual Setup

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/interviews-tv/platform.git
cd platform

# Copy environment configuration
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Application
APP_NAME="Interviews.tv"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:3000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=interviews_tv
DB_USERNAME=root
DB_PASSWORD=

# Cache & Sessions
CACHE_DRIVER=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# File Storage
FILESYSTEM_DISK=local
AWS_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Mail
MAIL_MAILER=smtp
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null

# Security
JWT_SECRET=your-jwt-secret-here
CSRF_SECRET=your-csrf-secret-here
```

### 3. Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install
```

### 4. Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
php artisan migrate

# Seed database with sample data
php artisan db:seed
```

### 5. Build Frontend

```bash
# Development build with hot reload
npm run dev

# Or production build
npm run build
```

### 6. Start Development Servers

```bash
# Start PHP development server (Terminal 1)
php -S localhost:8000 -t api/public

# Start frontend development server (Terminal 2)
npm run serve
```

## 🗃️ Database Configuration

### MySQL Setup

```sql
-- Create database
CREATE DATABASE interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional)
CREATE USER 'interviews_tv'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON interviews_tv.* TO 'interviews_tv'@'localhost';
FLUSH PRIVILEGES;
```

### Redis Setup (Optional)

```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

## 📁 Project Structure

```
interviews-tv/
├── api/                    # Backend PHP application
│   ├── config/            # Configuration files
│   ├── src/               # Source code
│   │   ├── Controllers/   # API controllers
│   │   ├── Models/        # Data models
│   │   ├── Services/      # Business logic
│   │   └── Middleware/    # Request middleware
│   ├── tests/             # Backend tests
│   └── public/            # Public web directory
├── web/                   # Frontend application
│   ├── src/               # Source code
│   │   ├── components/    # Vue/React components
│   │   ├── services/      # API services
│   │   ├── stores/        # State management
│   │   └── utils/         # Utility functions
│   ├── tests/             # Frontend tests
│   └── public/            # Static assets
├── docs/                  # Documentation
├── docker/                # Docker configuration
├── scripts/               # Build and deployment scripts
└── storage/               # File storage
```

## 🔧 Development Tools

### Code Quality

```bash
# PHP Code Style (PSR-12)
composer run phpcs
composer run phpcbf

# PHP Static Analysis
composer run phpstan

# JavaScript/TypeScript Linting
npm run lint
npm run lint:fix

# Run all quality checks
npm run quality
```

### Testing

```bash
# Run PHP tests
composer test

# Run JavaScript tests
npm test

# Run tests with coverage
composer test:coverage
npm run test:coverage

# Run specific test file
./vendor/bin/phpunit tests/Unit/UserTest.php
npm test -- UserService.test.js
```

### Database Management

```bash
# Create new migration
php artisan make:migration create_interviews_table

# Run migrations
php artisan migrate

# Rollback migrations
php artisan migrate:rollback

# Reset database
php artisan migrate:fresh --seed

# Create model with migration
php artisan make:model Interview -m
```

## 🌐 Frontend Development

### Available Scripts

```bash
# Development server with hot reload
npm run serve

# Build for production
npm run build

# Run tests
npm run test

# Lint and fix files
npm run lint

# Type checking (if using TypeScript)
npm run type-check
```

### Component Development

```bash
# Create new component
npm run generate:component ComponentName

# Create new service
npm run generate:service ServiceName

# Create new store module
npm run generate:store ModuleName
```

## 🔐 Security Setup

### SSL Certificates (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Or use mkcert for trusted certificates
mkcert localhost 127.0.0.1 ::1
```

### Environment Security

```bash
# Generate application key
php artisan key:generate

# Generate JWT secret
php artisan jwt:secret

# Set proper file permissions
chmod 755 storage/
chmod 755 bootstrap/cache/
chmod 644 .env
```

## 📧 Email Testing

### Using MailHog (Recommended)

```bash
# Install MailHog
go get github.com/mailhog/MailHog

# Start MailHog
MailHog

# Configure .env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
```

Access MailHog web interface at http://localhost:8025

### Using Mailtrap

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
```

## 🎥 Media Processing

### FFmpeg Setup

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Video Processing Configuration

```env
# Video processing
FFMPEG_BINARIES=/usr/bin/ffmpeg
VIDEO_DISK=videos
THUMBNAIL_DISK=thumbnails
MAX_VIDEO_SIZE=500000000  # 500MB
ALLOWED_VIDEO_FORMATS=mp4,webm,mov
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check MySQL service
sudo systemctl status mysql

# Check connection
mysql -u root -p -e "SELECT 1"

# Verify database exists
mysql -u root -p -e "SHOW DATABASES"
```

#### Permission Errors
```bash
# Fix storage permissions
sudo chown -R www-data:www-data storage/
sudo chmod -R 755 storage/

# Fix cache permissions
sudo chown -R www-data:www-data bootstrap/cache/
sudo chmod -R 755 bootstrap/cache/
```

#### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node version
nvm use 18
```

#### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check Redis logs
sudo journalctl -u redis-server
```

### Performance Issues

#### Slow Database Queries
```bash
# Enable query logging
mysql -u root -p -e "SET GLOBAL general_log = 'ON';"

# Check slow query log
sudo tail -f /var/log/mysql/mysql-slow.log
```

#### Memory Issues
```bash
# Increase PHP memory limit
echo "memory_limit = 512M" >> /etc/php/8.1/cli/php.ini

# Check current limits
php -i | grep memory_limit
```

## 📚 Additional Resources

- **API Documentation**: [docs/api/README.md](api/README.md)
- **Architecture Guide**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](DEPLOYMENT.md)

## 🆘 Getting Help

- **Documentation**: https://docs.interviews.tv
- **GitHub Issues**: https://github.com/interviews-tv/platform/issues
- **Discord Community**: https://discord.gg/interviews-tv
- **Email Support**: dev-support@interviews.tv

---

**Happy coding! 🚀**
