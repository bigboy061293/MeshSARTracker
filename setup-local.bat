@echo off
echo 🚀 MeshTac Local Deployment Setup
echo ==================================

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm
    pause
    exit /b 1
)

echo ✅ npm detected
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

REM Create .env file if not exists
if not exist .env (
    echo ⚙️ Creating .env file...
    (
        echo # Database Configuration ^(PostgreSQL required^)
        echo # For local PostgreSQL: postgresql://username:password@localhost:5432/database_name
        echo # For Docker: postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev
        echo DATABASE_URL=postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev
        echo.
        echo # Session Security ^(change this!^)
        echo SESSION_SECRET=your-super-secret-session-key-change-this
        echo.
        echo # Development Environment
        echo NODE_ENV=development
        echo.
        echo # Hardware Configuration ^(adjust for your system^)
        echo # Windows: COM4, COM5, etc.
        echo # Network: udp:127.0.0.1:14550, tcp:192.168.1.100:5760
        echo MAVLINK_CONNECTION=COM4
        echo MESHTASTIC_PORT=COM5
        echo.
        echo # Development flags
        echo MAVLINK_USE_SIMULATION=false
        echo MESHTASTIC_USE_SIMULATION=false
    ) > .env
    echo ✅ .env file created - please edit with your database credentials
) else (
    echo ⚠️ .env file already exists - using existing configuration
)

REM Create docker-compose.yml if not exists
if not exist docker-compose.yml (
    echo 🐳 Creating Docker Compose file for PostgreSQL...
    (
        echo version: '3.8'
        echo services:
        echo   postgres:
        echo     image: postgres:16
        echo     environment:
        echo       POSTGRES_DB: meshtac_dev
        echo       POSTGRES_USER: meshtac_user
        echo       POSTGRES_PASSWORD: your_password
        echo     ports:
        echo       - "5432:5432"
        echo     volumes:
        echo       - postgres_data:/var/lib/postgresql/data
        echo     restart: unless-stopped
        echo.
        echo volumes:
        echo   postgres_data:
    ) > docker-compose.yml
    echo ✅ Docker Compose file created
)

REM Check for PostgreSQL
echo 🔍 Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL client found
) else (
    echo ⚠️ PostgreSQL client not found
    echo 📋 Install PostgreSQL from: https://www.postgresql.org/download/windows/
    echo 📋 Or use Docker: docker-compose up -d postgres
)

REM Check for Docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker detected - you can use: docker-compose up -d postgres
) else (
    echo 📋 Docker not found - install from: https://www.docker.com/products/docker-desktop
)

echo.
echo 🔌 Checking COM ports...
echo 📡 Check Device Manager for available COM ports
echo 📋 Common ports: COM1, COM3, COM4, COM5

echo.
echo 🎯 Next Steps:
echo ==============
echo 1. Set up PostgreSQL:
echo    Option A: Install locally and create database
echo    Option B: docker-compose up -d postgres
echo.
echo 2. Update .env file with your database credentials
echo.
echo 3. Initialize database schema:
echo    npm run db:push
echo.
echo 4. Start development server:
echo    npm run dev
echo.
echo 5. Open http://localhost:5000 in your browser
echo.
echo 📖 For detailed instructions, see LOCAL_DEPLOYMENT_GUIDE.md
echo.
echo 🔧 Hardware setup ^(optional^):
echo    - Connect Meshtastic device to USB
echo    - Connect drone via MAVLink ^(USB/network^)
echo    - Update MAVLINK_CONNECTION and MESHTASTIC_PORT in .env
echo.
echo ✨ Happy coding!
echo.
pause