# Local Deployment Guide for MeshTac

## Prerequisites

### System Requirements
- **Node.js 20+** (LTS recommended)
- **PostgreSQL 16+** (or Docker with PostgreSQL)
- **Git** for cloning the repository
- **Serial port access** for drone hardware (Windows: COM ports, Linux/Mac: /dev/tty*)

### Hardware Requirements
- **Meshtastic devices** (optional) - for mesh networking
- **MAVLink-compatible drone** (optional) - for drone control
- **USB-to-serial adapters** if needed for device connections

## Installation Steps

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd meshtac

# Install dependencies
npm install

# Install development dependencies
npm install --save-dev @types/node typescript tsx
```

### 2. Database Setup

#### Option A: Local PostgreSQL Installation

**Windows:**
```bash
# Download PostgreSQL from https://www.postgresql.org/download/windows/
# Install and note the credentials

# Create database
createdb meshtac_dev
```

**macOS (using Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb meshtac_dev
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql-16 postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE meshtac_dev;
CREATE USER meshtac_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE meshtac_dev TO meshtac_user;
\q
```

#### Option B: Docker PostgreSQL

```bash
# Create docker-compose.yml
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

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d postgres
```

### 3. Environment Configuration

Create `.env` file in project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev

# Session Security
SESSION_SECRET=your-super-secret-session-key-here

# Development Environment
NODE_ENV=development

# MAVLink Configuration (optional)
MAVLINK_CONNECTION=COM4
# For Linux/Mac: MAVLINK_CONNECTION=/dev/ttyUSB0
# For network: MAVLINK_CONNECTION=udp:127.0.0.1:14550

# Meshtastic Configuration (optional)
MESHTASTIC_PORT=COM5
# For Linux/Mac: MESHTASTIC_PORT=/dev/ttyACM0

# Development flags (optional)
MAVLINK_USE_SIMULATION=false
MESHTASTIC_USE_SIMULATION=false
```

### 4. Database Schema Setup

```bash
# Push database schema
npm run db:push

# Verify database connection
npm run db:studio
# This opens Drizzle Studio at http://localhost:4983
```

### 5. Initial Data Setup

The application will automatically create default settings and demo data on first run.

## Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Application will be available at:
# http://localhost:5000
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Hardware Configuration

### COM Port Detection

**Windows:**
```bash
# List available COM ports
wmic path win32_pnpentity where "caption like '%(COM%'" get caption,name
```

**Linux/Mac:**
```bash
# List serial devices
ls /dev/tty*

# For USB devices specifically
ls /dev/ttyUSB* /dev/ttyACM*
```

### Serial Port Permissions (Linux/Mac)

```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# Or set specific permissions
sudo chmod 666 /dev/ttyUSB0
```

### Testing Hardware Connections

**Test MAVLink connection:**
```bash
# Install screen for serial monitoring
sudo apt install screen  # Linux
brew install screen       # macOS

# Monitor serial port
screen /dev/ttyUSB0 57600  # Linux/Mac
# For Windows, use PuTTY or Arduino IDE Serial Monitor
```

**Test Meshtastic connection:**
```bash
# Install meshtastic CLI tool
pip install meshtastic

# Test connection
meshtastic --port COM5 --info  # Windows
meshtastic --port /dev/ttyACM0 --info  # Linux/Mac
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql  # Linux
   brew services list | grep postgresql  # macOS
   
   # Verify connection
   psql -h localhost -U meshtac_user -d meshtac_dev
   ```

2. **Serial Port Access Denied**
   ```bash
   # Linux: Check permissions
   ls -la /dev/ttyUSB0
   
   # Add user to dialout group
   sudo usermod -a -G dialout $USER
   # Log out and back in
   ```

3. **Node.js Version Issues**
   ```bash
   # Install Node Version Manager
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node.js 20
   nvm install 20
   nvm use 20
   ```

4. **Port Already in Use**
   ```bash
   # Find process using port 5000
   lsof -i :5000  # macOS/Linux
   netstat -ano | findstr :5000  # Windows
   
   # Kill process or change port in package.json
   ```

### Application Logs

```bash
# View application logs
npm run dev  # Shows real-time logs

# Debug database queries
DEBUG=drizzle:* npm run dev

# Enable verbose logging
NODE_DEBUG=* npm run dev
```

## Development Workflow

### File Structure
```
meshtac/
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Shared types and schemas
├── .env             # Environment variables
├── package.json     # Dependencies and scripts
└── drizzle.config.ts # Database configuration
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run db:push     # Push schema changes to database
npm run db:studio   # Open database management UI
npm run test        # Run tests (if configured)
```

### Code Hot Reload
- Frontend: Vite provides instant hot reload
- Backend: tsx provides automatic restart on changes
- Database: Drizzle Studio for real-time schema management

## Production Deployment

### Build Optimization
```bash
# Production build with optimizations
NODE_ENV=production npm run build

# Verify build
ls -la dist/
```

### Environment Variables for Production
```bash
# Required production variables
DATABASE_URL=postgresql://user:pass@host:port/db
SESSION_SECRET=production-secret-key
NODE_ENV=production

# Hardware connections
MAVLINK_CONNECTION=udp:drone-ip:14550
MESHTASTIC_PORT=/dev/ttyACM0
```

### Process Management
```bash
# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start npm --name "meshtac" -- start

# Monitor application
pm2 status
pm2 logs meshtac
pm2 restart meshtac
```

## Security Considerations

### Local Network Access
- Application binds to `localhost:5000` by default
- For network access, configure `HOST=0.0.0.0` in environment
- Use firewall rules to restrict access as needed

### Hardware Security
- Secure physical access to serial devices
- Use appropriate user permissions for device access
- Monitor device connections and usage

### Data Protection
- Regular database backups
- Secure storage of environment variables
- Network encryption for remote connections

## Support

### Debug Information Collection
```bash
# System information
node --version
npm --version
uname -a  # Linux/Mac
systeminfo  # Windows

# Application logs
npm run dev > debug.log 2>&1

# Database connectivity
psql $DATABASE_URL -c "SELECT version();"
```

For additional support, check:
- Application logs in the terminal
- Browser developer console for frontend issues
- Database connection with provided tools
- Hardware device manager for serial port issues