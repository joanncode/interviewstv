@echo off
REM Interviews.tv Startup Script for Windows
REM This script helps you get the platform running quickly

echo 🎬 Starting Interviews.tv Platform...
echo ==================================

REM Check if PHP is installed
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP is not installed. Please install PHP 8.0 or higher.
    pause
    exit /b 1
)

echo ✓ PHP is installed

REM Set up database if setup.php exists
if exist setup.php (
    echo.
    echo 📋 Setting up database...
    php setup.php
    
    if %errorlevel% neq 0 (
        echo ❌ Database setup failed. Please check your MySQL/MariaDB connection.
        echo    Make sure MySQL/MariaDB is running and accessible.
        pause
        exit /b 1
    )
    
    echo ✓ Database setup completed
) else (
    echo ⚠️  setup.php not found. Skipping database setup.
)

echo.
echo 🚀 Starting servers...

REM Start API server
echo Starting API server on port 8001...
start /B php -S localhost:8001 -t api/ > api_server.log 2>&1

REM Wait for API server to start
timeout /t 3 /nobreak >nul

REM Start web server
echo Starting web server on port 8000...
start /B php -S localhost:8000 -t web/public/ > web_server.log 2>&1

REM Wait for web server to start
timeout /t 3 /nobreak >nul

echo.
echo 🎉 Interviews.tv is now running!
echo ================================
echo.
echo 📱 Frontend: http://localhost:8000
echo 🔧 API:      http://localhost:8001/api
echo.
echo 🔐 Login Credentials:
echo    Admin:    admin@interviews.tv    / admin123
echo    Creator:  creator@interviews.tv  / creator123
echo    Business: business@interviews.tv / business123
echo    User:     user@interviews.tv     / user123
echo.
echo 🛠️  Admin Panel: http://localhost:8000/admin
echo.
echo 📝 Logs:
echo    API Server: api_server.log
echo    Web Server: web_server.log
echo.
echo Opening browser...
start http://localhost:8000
echo.
echo Press any key to stop the servers...
pause >nul

REM Stop servers (this is basic - in production you'd want better process management)
echo.
echo 🛑 Stopping servers...
taskkill /F /IM php.exe >nul 2>&1
echo ✓ Servers stopped
echo 👋 Goodbye!
pause
