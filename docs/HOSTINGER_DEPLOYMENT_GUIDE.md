# Hostinger Deployment Guide for Interviews.tv (Small Scale)

## Overview
This guide explains how to deploy Interviews.tv on Hostinger shared hosting for a small-scale deployment supporting the admin and up to 10 streamers. This is a cost-effective solution for testing and small community use.

## Hostinger Plan Requirements

### Recommended Plan: Business Shared Hosting
- **Cost**: $3.99/month (with discount)
- **Storage**: 200GB SSD
- **Bandwidth**: Unlimited
- **Databases**: Unlimited MySQL
- **PHP**: 8.1+ support
- **SSL**: Free SSL certificate
- **Email**: 100 email accounts

### Alternative: VPS Plan (Better Performance)
- **Cost**: $3.95/month (VPS 1)
- **RAM**: 1GB
- **Storage**: 20GB SSD
- **CPU**: 1 vCPU
- **Full root access**
- **Better for streaming**

## Limitations of Shared Hosting for Streaming

### What WON'T Work on Shared Hosting:
- ❌ **Node.js Streaming Server** (requires dedicated server)
- ❌ **RTMP Server** (port restrictions)
- ❌ **Real-time WebRTC** (resource intensive)
- ❌ **FFmpeg processing** (CPU restrictions)
- ❌ **WebSocket connections** (limited support)

### What WILL Work:
- ✅ **PHP Web Application** (frontend + admin)
- ✅ **MySQL Database** (user management, video metadata)
- ✅ **File Uploads** (video files up to hosting limits)
- ✅ **YouTube Integration** (manual curation system)
- ✅ **User Authentication** (admin + streamers)
- ✅ **Video Embedding** (YouTube, Vimeo, external links)

## Modified Architecture for Hostinger

### Simplified Stack:
```
┌─────────────────────────────────────────────────────────┐
│                    HOSTINGER HOSTING                    │
├─────────────────────────────────────────────────────────┤
│  PHP 8.1+ Web Application                              │
│  ├── Admin Panel (Manual Curation)                     │
│  ├── User Management (Admin + 10 Streamers)            │
│  ├── Video Metadata Storage                            │
│  └── YouTube Integration                               │
├─────────────────────────────────────────────────────────┤
│  MySQL Database                                         │
│  ├── Users, Videos, Comments                           │
│  └── Curation Workflow                                 │
├─────────────────────────────────────────────────────────┤
│  External Streaming Solutions                           │
│  ├── YouTube Live (Primary)                            │
│  ├── Twitch (Alternative)                              │
│  └── Vimeo Live (Professional)                         │
└─────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Prepare Files for Upload

#### 1.1 Create Hostinger-Compatible Structure
```bash
# Create deployment folder
mkdir hostinger-deployment
cd hostinger-deployment

# Copy essential PHP files
cp -r ../api/* ./
cp -r ../admin ./
cp -r ../web/public/* ./
cp ../database/schema.sql ./
cp ../.env.example ./.env
```

#### 1.2 Modify Configuration for Shared Hosting
Create `config/hostinger.php`:
```php
<?php
// Hostinger-specific configuration
define('APP_ENV', 'production');
define('DB_HOST', 'localhost'); // Hostinger MySQL host
define('DB_NAME', 'u123456789_interviews'); // Your database name
define('DB_USER', 'u123456789_user'); // Your database user
define('DB_PASS', 'your_secure_password');

// Disable streaming features
define('STREAMING_ENABLED', false);
define('RTMP_ENABLED', false);
define('WEBSOCKET_ENABLED', false);

// Enable YouTube integration only
define('YOUTUBE_API_ENABLED', true);
define('YOUTUBE_API_KEY', 'your_youtube_api_key');
```

### Step 2: Database Setup

#### 2.1 Create Database in Hostinger cPanel
1. Login to Hostinger cPanel
2. Go to "MySQL Databases"
3. Create database: `u123456789_interviews`
4. Create user with full privileges
5. Note down credentials

#### 2.2 Import Database Schema
```sql
-- Simplified schema for shared hosting
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'streamer', 'user') DEFAULT 'user',
    avatar_url VARCHAR(500) NULL,
    bio TEXT NULL,
    youtube_channel VARCHAR(255) NULL,
    twitch_channel VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE curated_videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    youtube_id VARCHAR(50),
    youtube_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    duration INT,
    category VARCHAR(100),
    tags TEXT,
    curator_id INT,
    status ENUM('pending', 'approved', 'featured', 'rejected') DEFAULT 'pending',
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curator_id) REFERENCES users(id)
);

CREATE TABLE video_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    parent_id INT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES curated_videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Step 3: File Upload and Configuration

#### 3.1 Upload Files via File Manager
1. Access Hostinger File Manager
2. Navigate to `public_html`
3. Upload all PHP files
4. Set permissions: 755 for directories, 644 for files

#### 3.2 Configure .htaccess
```apache
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Routes
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# Admin Routes
RewriteRule ^admin/(.*)$ admin/index.php [QSA,L]

# Clean URLs
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Security
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

# PHP Settings for shared hosting
php_value upload_max_filesize 50M
php_value post_max_size 50M
php_value max_execution_time 300
php_value memory_limit 256M
```

### Step 4: Streaming Solution Integration

#### 4.1 YouTube Live Integration
```php
// YouTube Live streaming for users
class YouTubeLiveIntegration {
    public function createStreamingGuide($user) {
        return [
            'platform' => 'YouTube Live',
            'setup_url' => 'https://studio.youtube.com/channel/UC' . $user['youtube_channel'] . '/livestreaming',
            'requirements' => [
                'Verified YouTube channel',
                'No live streaming restrictions in past 90 days',
                'OBS Studio or similar streaming software'
            ],
            'rtmp_server' => 'rtmp://a.rtmp.youtube.com/live2/',
            'stream_key' => 'Get from YouTube Studio'
        ];
    }
}
```

#### 4.2 Alternative Streaming Platforms
```php
// Multi-platform streaming support
$streamingPlatforms = [
    'youtube' => [
        'name' => 'YouTube Live',
        'rtmp' => 'rtmp://a.rtmp.youtube.com/live2/',
        'setup_guide' => '/guides/youtube-live-setup'
    ],
    'twitch' => [
        'name' => 'Twitch',
        'rtmp' => 'rtmp://live.twitch.tv/live/',
        'setup_guide' => '/guides/twitch-setup'
    ],
    'facebook' => [
        'name' => 'Facebook Live',
        'rtmp' => 'rtmps://live-api-s.facebook.com:443/rtmp/',
        'setup_guide' => '/guides/facebook-live-setup'
    ]
];
```

### Step 5: Feature Adaptations

#### 5.1 Video Management (No Live Streaming)
- **Pre-recorded uploads**: Users upload MP4 files
- **YouTube embedding**: Link to existing YouTube videos
- **Scheduled publishing**: Queue videos for release
- **Manual approval**: Admin reviews all content

#### 5.2 User Roles and Permissions
```php
// Simplified user roles for small scale
$userRoles = [
    'admin' => [
        'can_approve_videos',
        'can_manage_users',
        'can_feature_content',
        'can_access_analytics'
    ],
    'streamer' => [
        'can_upload_videos',
        'can_submit_youtube_links',
        'can_edit_profile',
        'can_comment'
    ],
    'user' => [
        'can_view_videos',
        'can_comment',
        'can_like_videos'
    ]
];
```

### Step 6: Performance Optimization

#### 6.1 Caching Strategy
```php
// Simple file-based caching for shared hosting
class SimpleCache {
    private $cacheDir = './cache/';
    
    public function get($key) {
        $file = $this->cacheDir . md5($key) . '.cache';
        if (file_exists($file) && (time() - filemtime($file)) < 3600) {
            return unserialize(file_get_contents($file));
        }
        return false;
    }
    
    public function set($key, $data) {
        $file = $this->cacheDir . md5($key) . '.cache';
        file_put_contents($file, serialize($data));
    }
}
```

#### 6.2 Database Optimization
```sql
-- Add indexes for better performance
ALTER TABLE curated_videos ADD INDEX idx_status (status);
ALTER TABLE curated_videos ADD INDEX idx_category (category);
ALTER TABLE curated_videos ADD INDEX idx_created (created_at);
ALTER TABLE video_comments ADD INDEX idx_video (video_id);
```

## Cost Analysis

### Hostinger Business Hosting
- **Monthly Cost**: $3.99/month
- **Annual Cost**: $47.88/year
- **Includes**: 200GB storage, unlimited bandwidth, SSL

### Additional Costs
- **Domain**: $8.99/year (.com)
- **YouTube API**: Free (with quotas)
- **Email**: Included
- **Backups**: $2/month (optional)

### Total Annual Cost: ~$70/year

## Limitations and Workarounds

### Streaming Limitations
- **No real-time streaming**: Use YouTube Live, Twitch
- **No RTMP server**: Direct users to external platforms
- **No WebRTC**: Embed external streams

### Performance Limitations
- **Shared resources**: Peak traffic may slow site
- **File upload limits**: 50MB max per file
- **Database connections**: Limited concurrent connections

### Workarounds
- **CDN**: Use Cloudflare (free tier)
- **Image optimization**: Compress before upload
- **Lazy loading**: Load content as needed
- **External storage**: Use YouTube for video hosting

## Monitoring and Maintenance

### Basic Analytics
```php
// Simple analytics tracking
class Analytics {
    public function trackPageView($page) {
        $data = [
            'page' => $page,
            'ip' => $_SERVER['REMOTE_ADDR'],
            'timestamp' => time(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT']
        ];
        file_put_contents('./logs/analytics.log', json_encode($data) . "\n", FILE_APPEND);
    }
}
```

### Backup Strategy
- **Database**: Weekly exports via cPanel
- **Files**: Monthly downloads via File Manager
- **Automated**: Use Hostinger's backup service

## Quick Deployment Checklist

### Pre-Deployment
- [ ] Purchase Hostinger Business hosting plan
- [ ] Register domain name
- [ ] Set up MySQL database in cPanel
- [ ] Get YouTube API key
- [ ] Prepare deployment files

### Deployment Steps
- [ ] Upload PHP files to public_html
- [ ] Configure .env with database credentials
- [ ] Import database schema
- [ ] Set file permissions (755/644)
- [ ] Configure .htaccess for clean URLs
- [ ] Test admin login functionality
- [ ] Set up first admin user
- [ ] Configure YouTube integration
- [ ] Test video curation workflow

### Post-Deployment
- [ ] Set up SSL certificate (free with Hostinger)
- [ ] Configure email accounts
- [ ] Set up basic analytics tracking
- [ ] Create user documentation
- [ ] Test with 2-3 streamers
- [ ] Monitor performance and errors

## Migration Path to Full Platform

### When to Upgrade
- **50+ concurrent users**
- **Need for real-time streaming**
- **Advanced analytics requirements**
- **Custom streaming features**

### Upgrade Options
1. **Hostinger VPS**: $3.95/month → Enable Node.js streaming
2. **DigitalOcean**: $300/month → Full platform deployment
3. **AWS**: $800/month → Enterprise-grade scaling

## Support and Resources

### Hostinger Support
- **24/7 Live Chat**: Available in cPanel
- **Knowledge Base**: help.hostinger.com
- **Video Tutorials**: YouTube channel

### Platform Documentation
- **Setup Guide**: `/docs/SETUP.md`
- **API Documentation**: `/docs/API.md`
- **User Manual**: `/docs/USER_GUIDE.md`

### Community
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Community support (when available)
- **Email**: support@interviews.tv

## Conclusion

While Hostinger shared hosting cannot support the full streaming infrastructure, it can effectively host a simplified version of Interviews.tv focused on:

1. **Content curation** and management
2. **User community** features
3. **YouTube integration** for streaming
4. **Admin workflow** for quality control

This approach costs only **$70/year** and can support the admin plus 10 streamers effectively, with room to migrate to VPS or dedicated hosting as the platform grows.

**Key Benefits**:
- ✅ **Ultra-low cost**: $70/year total
- ✅ **Quick deployment**: 1-2 hours setup
- ✅ **Proven technology**: PHP + MySQL
- ✅ **Easy maintenance**: cPanel interface
- ✅ **Scalable**: Clear upgrade path

The key is to leverage external streaming platforms (YouTube Live, Twitch) while maintaining the community and curation features on Hostinger.
