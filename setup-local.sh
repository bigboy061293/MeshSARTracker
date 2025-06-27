#!/bin/bash

echo "🚀 MeshTac Local Deployment Setup"
echo "=================================="

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 20+"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo "✅ npm $(npm --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Check for .env file
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << EOF
# Database Configuration (PostgreSQL required)
# For local PostgreSQL: postgresql://username:password@localhost:5432/database_name
# For Docker: postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev
DATABASE_URL=postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev

# Session Security (change this!)
SESSION_SECRET=your-super-secret-session-key-$(openssl rand -hex 16)

# Development Environment
NODE_ENV=development

# Hardware Configuration (optional - adjust for your system)
# Windows: COM4, COM5, etc.
# Linux/Mac: /dev/ttyUSB0, /dev/ttyACM0, etc.
# Network: udp:127.0.0.1:14550, tcp:192.168.1.100:5760
MAVLINK_CONNECTION=COM4
MESHTASTIC_PORT=COM5

# Development flags
MAVLINK_USE_SIMULATION=false
MESHTASTIC_USE_SIMULATION=false
EOF
    echo "✅ .env file created - please edit with your database credentials"
else
    echo "⚠️  .env file already exists - using existing configuration"
fi

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
    echo "📋 To test connection: psql \$DATABASE_URL"
else
    echo "⚠️  PostgreSQL client not found"
    echo "📋 Install PostgreSQL or use Docker:"
    echo "   - PostgreSQL: https://www.postgresql.org/download/"
    echo "   - Docker: docker-compose up -d postgres"
fi

# Create docker-compose.yml if not exists
if [ ! -f docker-compose.yml ]; then
    echo "🐳 Creating Docker Compose file for PostgreSQL..."
    cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: meshtac_dev
      POSTGRES_USER: meshtac_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
EOF
    echo "✅ Docker Compose file created"
    echo "📋 To start PostgreSQL: docker-compose up -d postgres"
fi

# Check serial ports
echo "🔌 Checking serial ports..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    SERIAL_PORTS=$(ls /dev/tty{USB,ACM}* 2>/dev/null || echo "none")
    echo "📡 Serial devices: $SERIAL_PORTS"
    if [ "$SERIAL_PORTS" != "none" ]; then
        echo "📋 You may need permissions: sudo usermod -a -G dialout \$USER"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    SERIAL_PORTS=$(ls /dev/tty.{usb,usbserial}* 2>/dev/null || echo "none")
    echo "📡 Serial devices: $SERIAL_PORTS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "📡 On Windows, check Device Manager for COM ports"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Set up PostgreSQL:"
echo "   Option A: Install locally and create database"
echo "   Option B: docker-compose up -d postgres"
echo ""
echo "2. Update .env file with your database credentials"
echo ""
echo "3. Initialize database schema:"
echo "   npm run db:push"
echo ""
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:5000 in your browser"
echo ""
echo "📖 For detailed instructions, see LOCAL_DEPLOYMENT_GUIDE.md"
echo ""
echo "🔧 Hardware setup (optional):"
echo "   - Connect Meshtastic device to USB"
echo "   - Connect drone via MAVLink (USB/network)"
echo "   - Update MAVLINK_CONNECTION and MESHTASTIC_PORT in .env"
echo ""
echo "✨ Happy coding!"
EOF