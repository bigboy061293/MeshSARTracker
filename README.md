# MeshTac - Meshtastic SAR Command Center

A comprehensive Search and Rescue (SAR) communication platform featuring real-time Meshtastic mesh networking, drone control via MAVLink, and collaborative mission management.

## Features

- 🌐 **Real-time Mesh Communication** - Meshtastic device integration
- 🚁 **Drone Control** - MAVLink-compatible autopilot support
- 🗺️ **Tactical Mapping** - Interactive maps with real-time positioning
- 👥 **Role-based Access** - Admin, User, and Watcher permissions
- 📡 **Cross-platform** - Works on Windows, Mac, Linux, and cloud environments
- 💬 **Team Communication** - Message routing and history
- 🎯 **Mission Planning** - Flight planning and execution tracking

## Quick Start

### Cloud Deployment (Replit)
The application is ready to run on Replit with automatic database provisioning and environment setup.

### Local Deployment

#### Automated Setup
```bash
# Linux/Mac
./setup-local.sh

# Windows
setup-local.bat
```

#### Manual Setup
1. **Prerequisites**
   - Node.js 20+
   - PostgreSQL 16+
   - Serial port access for hardware

2. **Installation**
   ```bash
   git clone <repository-url>
   cd meshtac
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Database Setup**
   ```bash
   # Option A: Local PostgreSQL
   createdb meshtac_dev
   
   # Option B: Docker
   docker-compose up -d postgres
   
   # Initialize schema
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # Open http://localhost:5000
   ```

## Hardware Configuration

### MAVLink Connections
- **Serial**: `COM4` (Windows), `/dev/ttyUSB0` (Linux/Mac)
- **Network**: `udp:192.168.1.100:14550`, `tcp:drone.local:5760`

### Meshtastic Devices
- **Serial**: `COM5` (Windows), `/dev/ttyACM0` (Linux/Mac)
- Auto-discovery of mesh network nodes

## Documentation

- **[Local Deployment Guide](LOCAL_DEPLOYMENT_GUIDE.md)** - Complete local setup instructions
- **[Cloud Deployment Guide](CLOUD_DEPLOYMENT_GUIDE.md)** - Cloud platform deployment
- **[Source Code Structure](SOURCE_CODE_STRUCTURE.md)** - Architecture overview

## Project Structure

```
meshtac/
├── client/           # React frontend application
├── server/           # Express backend with services
├── shared/           # Shared types and database schema
├── setup-local.*     # Automated setup scripts
└── docs/             # Documentation files
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run db:push     # Update database schema
npm run db:studio   # Open database management UI
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **Authentication**: Replit Auth with OpenID Connect
- **Hardware**: Serial communication for Meshtastic and MAVLink

## Development

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL database
- Hardware devices (optional for testing)

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/meshtac_dev
SESSION_SECRET=your-secret-key
MAVLINK_CONNECTION=COM4
MESHTASTIC_PORT=COM5
```

### Running Tests
```bash
npm test              # Run test suite
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Deployment

### Local Production
```bash
npm run build
npm start
```

### Cloud Platforms
- **Replit**: Automatic deployment with database provisioning
- **Railway/Vercel**: Configure PostgreSQL and environment variables
- **VPS**: Standard Node.js application deployment

## Hardware Support

### Supported Devices
- **MAVLink**: ArduPilot, PX4, any MAVLink v2.0 compatible autopilot
- **Meshtastic**: ESP32-based devices with firmware 2.0+
- **Connection**: USB serial, TCP/IP, UDP networks

### Network Requirements
- **Ports**: 5000 (web), 14550 (MAVLink UDP), 5760 (MAVLink TCP)
- **Protocols**: HTTP/HTTPS, WebSocket, Serial, UDP, TCP

## Security

- Role-based access control (Admin/User/Watcher)
- Secure session management
- Hardware access permissions
- Network connection encryption

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For deployment issues:
- Check the deployment guides
- Review application logs
- Test hardware connections
- Verify environment configuration

---

Built for Search and Rescue operations requiring reliable communication and coordination capabilities.