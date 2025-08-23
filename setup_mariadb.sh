#!/bin/bash

echo "=== MariaDB Setup for Interviews.tv ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    echo "Run as regular user: ./setup_mariadb.sh"
    exit 1
fi

# Check if MariaDB is installed
if ! command -v mysql &> /dev/null; then
    print_error "MariaDB/MySQL is not installed"
    echo "Please install MariaDB first:"
    echo "  Ubuntu/Debian: sudo apt install mariadb-server mariadb-client"
    echo "  CentOS/RHEL: sudo yum install mariadb-server mariadb"
    echo "  Arch: sudo pacman -S mariadb"
    exit 1
fi

# Check if MariaDB is running
if ! systemctl is-active --quiet mariadb && ! systemctl is-active --quiet mysql; then
    print_warning "MariaDB is not running. Attempting to start..."
    sudo systemctl start mariadb || sudo systemctl start mysql
    if [ $? -ne 0 ]; then
        print_error "Failed to start MariaDB"
        exit 1
    fi
    print_status "MariaDB started successfully"
fi

# Database configuration
DB_NAME="interviews_tv"
DB_USER="interviews_user"
DB_PASS="interviews_pass"
ROOT_PASS=""

echo "Setting up MariaDB for Interviews.tv..."
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Create a temporary SQL file for setup
SETUP_SQL="/tmp/mariadb_setup.sql"

cat > "$SETUP_SQL" << EOF
-- MariaDB Setup for Interviews.tv

-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';

-- Grant privileges
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE $DB_NAME;

-- Users table - Core user accounts
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'creator', 'business', 'user') DEFAULT 'user',
    avatar_url VARCHAR(500) NULL,
    hero_banner_url VARCHAR(500) NULL,
    bio TEXT NULL,
    location VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    company VARCHAR(255) NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (user_id, permission)
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    industry VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    website VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    founded_year INT NULL,
    employee_count ENUM('1-10', '11-50', '51-200', '201-500', '500+') NULL,
    logo_url VARCHAR(500) NULL,
    banner_url VARCHAR(500) NULL,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id INT NOT NULL,
    business_id INT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    video_url VARCHAR(500) NULL,
    audio_url VARCHAR(500) NULL,
    thumbnail_url VARCHAR(500) NULL,
    duration_seconds INT NULL,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_industry ON businesses(industry);
CREATE INDEX IF NOT EXISTS idx_interviews_slug ON interviews(slug);
CREATE INDEX IF NOT EXISTS idx_interviews_category ON interviews(category);
CREATE INDEX IF NOT EXISTS idx_interviews_published ON interviews(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Insert dummy users with proper password hashes
-- All passwords are: password123
INSERT INTO users (id, email, password_hash, name, role, bio, location, website, email_verified, is_active) VALUES
(1, 'admin@interviews.tv', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin', 'Platform Administrator with full system access', 'San Francisco, CA', 'https://interviews.tv', TRUE, TRUE),
(2, 'creator@interviews.tv', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Content Creator', 'creator', 'Professional content creator specializing in business interviews', 'Los Angeles, CA', 'https://contentcreator.com', TRUE, TRUE),
(3, 'business@interviews.tv', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Business Owner', 'business', 'Business profile manager and entrepreneur', 'New York, NY', 'https://mybusiness.com', TRUE, TRUE),
(4, 'user@interviews.tv', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Regular User', 'user', 'Platform user interested in business content', 'Chicago, IL', NULL, TRUE, TRUE),
(5, 'john.doe@example.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'user', 'Software developer and tech enthusiast', 'Seattle, WA', 'https://johndoe.dev', TRUE, TRUE),
(6, 'jane.smith@company.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Smith', 'creator', 'Marketing specialist and content strategist', 'Austin, TX', 'https://janesmith.com', TRUE, TRUE),
(7, 'mike.wilson@startup.io', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike Wilson', 'business', 'Startup founder and entrepreneur', 'Boston, MA', 'https://startup.io', TRUE, TRUE),
(8, 'sarah.johnson@agency.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Johnson', 'creator', 'Digital marketing agency owner', 'Miami, FL', 'https://agency.com', TRUE, TRUE),
(9, 'david.brown@tech.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David Brown', 'user', 'Product manager at tech company', 'San Diego, CA', NULL, FALSE, TRUE),
(10, 'lisa.davis@consulting.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lisa Davis', 'business', 'Business consultant and advisor', 'Denver, CO', 'https://consulting.com', TRUE, TRUE),
(11, 'alex.garcia@freelance.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Garcia', 'creator', 'Freelance video producer', 'Portland, OR', 'https://freelance.com', TRUE, TRUE),
(12, 'emma.taylor@nonprofit.org', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emma Taylor', 'user', 'Nonprofit organization coordinator', 'Nashville, TN', 'https://nonprofit.org', TRUE, TRUE),
(13, 'ryan.martinez@ecommerce.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ryan Martinez', 'business', 'E-commerce platform founder', 'Phoenix, AZ', 'https://ecommerce.com', TRUE, TRUE),
(14, 'olivia.anderson@media.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Olivia Anderson', 'creator', 'Media production specialist', 'Atlanta, GA', 'https://media.com', TRUE, TRUE),
(15, 'chris.thomas@finance.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chris Thomas', 'user', 'Financial analyst and investor', 'Charlotte, NC', NULL, TRUE, TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    bio = VALUES(bio),
    location = VALUES(location),
    website = VALUES(website);

-- Insert user permissions
INSERT INTO user_permissions (user_id, permission) VALUES
-- Admin permissions
(1, 'all'),
-- Creator permissions
(2, 'create_content'), (2, 'manage_profile'), (2, 'conduct_interviews'),
(6, 'create_content'), (6, 'manage_profile'), (6, 'conduct_interviews'),
(8, 'create_content'), (8, 'manage_profile'), (8, 'conduct_interviews'),
(11, 'create_content'), (11, 'manage_profile'), (11, 'conduct_interviews'),
(14, 'create_content'), (14, 'manage_profile'), (14, 'conduct_interviews'),
-- Business permissions
(3, 'manage_business'), (3, 'manage_profile'), (3, 'respond_interviews'),
(7, 'manage_business'), (7, 'manage_profile'), (7, 'respond_interviews'),
(10, 'manage_business'), (10, 'manage_profile'), (10, 'respond_interviews'),
(13, 'manage_business'), (13, 'manage_profile'), (13, 'respond_interviews'),
-- User permissions
(4, 'view_content'), (4, 'manage_profile'),
(5, 'view_content'), (5, 'manage_profile'),
(9, 'view_content'), (9, 'manage_profile'),
(12, 'view_content'), (12, 'manage_profile'),
(15, 'view_content'), (15, 'manage_profile')
ON DUPLICATE KEY UPDATE permission = VALUES(permission);

-- Show success message
SELECT 'Database setup completed successfully!' as message;
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
EOF

# Try to run the setup with different methods
echo "Attempting to set up MariaDB database..."

# Method 1: Try with sudo mysql (most common for MariaDB)
if sudo mysql < "$SETUP_SQL" 2>/dev/null; then
    print_status "Database setup completed using sudo mysql"
    SUCCESS=true
else
    print_warning "sudo mysql failed, trying alternative methods..."
    
    # Method 2: Try with mysql -u root
    if mysql -u root < "$SETUP_SQL" 2>/dev/null; then
        print_status "Database setup completed using mysql -u root"
        SUCCESS=true
    else
        # Method 3: Try with password prompt
        echo "Please enter the MariaDB root password (or press Enter if no password):"
        if mysql -u root -p < "$SETUP_SQL"; then
            print_status "Database setup completed using mysql -u root -p"
            SUCCESS=true
        else
            print_error "All connection methods failed"
            SUCCESS=false
        fi
    fi
fi

# Clean up temporary file
rm -f "$SETUP_SQL"

if [ "$SUCCESS" = true ]; then
    echo ""
    print_status "MariaDB setup completed successfully!"
    echo ""
    echo "📊 Database Information:"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo "   Password: $DB_PASS"
    echo ""
    echo "🔐 Login Credentials:"
    echo "   Admin: admin@interviews.tv / password123"
    echo "   Creator: creator@interviews.tv / password123"
    echo "   Business: business@interviews.tv / password123"
    echo "   User: user@interviews.tv / password123"
    echo "   Others: All use password123"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Update api/config/database.php if needed"
    echo "   2. Test the connection: curl http://localhost:8001/test.php"
    echo "   3. Access admin panel: http://localhost:8000/admin"
    echo ""
else
    echo ""
    print_error "MariaDB setup failed!"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Make sure MariaDB is running: sudo systemctl status mariadb"
    echo "   2. Try running mysql_secure_installation"
    echo "   3. Check MariaDB logs: sudo journalctl -u mariadb"
    echo "   4. Verify you can connect: mysql -u root -p"
    echo ""
    exit 1
fi
