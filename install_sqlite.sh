#!/bin/bash

echo "=== Installing SQLite Support for PHP ==="
echo ""

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then
    echo "This script needs to be run with sudo privileges"
    echo "Usage: sudo ./install_sqlite.sh"
    exit 1
fi

# Detect the operating system
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    echo "Detected Debian/Ubuntu system"
    echo "Installing php-sqlite3..."
    apt update
    apt install -y php-sqlite3 sqlite3
    
elif [ -f /etc/redhat-release ]; then
    # Red Hat/CentOS/Fedora
    echo "Detected Red Hat/CentOS/Fedora system"
    echo "Installing php-pdo and sqlite..."
    yum install -y php-pdo sqlite
    
elif [ -f /etc/arch-release ]; then
    # Arch Linux
    echo "Detected Arch Linux system"
    echo "Installing php-sqlite..."
    pacman -S --noconfirm php-sqlite sqlite
    
else
    echo "Unsupported operating system"
    echo "Please install php-sqlite3 manually for your system"
    exit 1
fi

echo ""
echo "✓ SQLite support installation completed"
echo ""
echo "Verifying installation..."

# Test PHP SQLite support
php -m | grep -i sqlite
if [ $? -eq 0 ]; then
    echo "✓ PHP SQLite support is now available"
else
    echo "✗ PHP SQLite support installation failed"
    exit 1
fi

echo ""
echo "You can now run the database setup with SQLite support:"
echo "php setup.php"
