# MeshTac - Meshtastic SAR Command Center

## Overview

MeshTac is a full-stack web application designed for Search and Rescue (SAR) operations, providing real-time communication through Meshtastic mesh networks and drone control via MAVLink integration. The application features role-based access control, tactical mapping, and comprehensive team management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state and custom hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API with custom hooks
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **Real-time Communication**: WebSocket server for live updates
- **API Design**: RESTful endpoints with role-based middleware

### Key Components

#### Database Layer
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Comprehensive schema covering users, nodes, messages, drones, missions, and shared maps
- **Migrations**: Automated database schema management
- **Connection**: Neon Database serverless connection with WebSocket constructor

#### Authentication System
- **Provider**: Replit Auth integration
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Role-based Access**: Three-tier system (admin, user, watcher)
- **Security**: OIDC with JWT tokens and secure cookie handling

#### Communication Services
- **Meshtastic Integration**: Real-time mesh network communication
- **MAVLink Integration**: Drone telemetry and control
- **WebSocket Service**: Real-time updates for nodes, drones, and messages
- **Message Handling**: Persistent message storage with acknowledgment tracking

#### Frontend Components
- **Layout System**: Header and sidebar navigation with responsive design
- **Tactical Map**: Interactive mapping with real-time position updates
- **Communication Panel**: Message interface with role-based permissions
- **Drone Control**: Flight data display and control interface
- **Mission Planning**: Mission creation and management system

## Data Flow

1. **Authentication Flow**: User authenticates via Replit Auth, session stored in PostgreSQL
2. **Real-time Updates**: WebSocket connections provide live data for nodes, drones, and messages
3. **API Communication**: RESTful endpoints handle CRUD operations with role-based access control
4. **Database Operations**: Drizzle ORM manages all database interactions with type safety
5. **Service Integration**: Background services handle Meshtastic and MAVLink protocol communication

## External Dependencies

### Production Dependencies
- **UI Framework**: React ecosystem with shadcn/ui components
- **Database**: Neon Database with PostgreSQL
- **Authentication**: Replit Auth service
- **Communication**: Meshtastic devices via serial/USB connection
- **Drone Control**: MAVLink-compatible autopilots
- **Real-time**: WebSocket connections for live updates

### Development Dependencies
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Development Environment**: Replit with Node.js runtime
- **Code Quality**: ESLint and TypeScript strict mode

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20 and PostgreSQL 16 modules
- **Hot Reload**: Vite development server with HMR
- **Database**: Automatic provisioning via Replit database service
- **Environment Variables**: Managed through Replit secrets

### Production Build
- **Frontend**: Vite builds client-side assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Replit autoscale deployment target
- **Database**: Production PostgreSQL with connection pooling

### Configuration Management
- **Environment-based**: Separate configurations for development and production
- **Database URL**: Required environment variable for database connectivity
- **Session Security**: Secure session secret management
- **OIDC Configuration**: Automated discovery with environment-specific URLs

## Changelog
- June 26, 2025: Initial setup with role-based authentication system
- June 26, 2025: Converted from dark to bright theme for better visibility
- June 26, 2025: Configured user roles - admin (vu.nguyen), user (user1), watcher (watcher1)
- June 26, 2025: Implemented persistent settings storage with database schema for MAVLink configuration
- June 26, 2025: Fixed MAVLink connection string saving issue - now supports COM4 and custom connection strings
- June 26, 2025: Added comprehensive MAVLink message logging to console - displays all incoming and outgoing messages with timestamps and payload details
- June 26, 2025: Implemented configurable MAVLink data source - users can now choose between simulated drone data and real MAVLink device connection via API endpoints or environment variables
- June 26, 2025: Updated MAVLink service to default to real device data on startup - system now attempts to connect to actual drone hardware first, with automatic fallback to simulation if connection fails
- June 26, 2025: Integrated real MAVLink libraries - installed `mavlink` and `serialport` packages to replace custom simulation with actual MAVLink protocol communication for genuine drone hardware compatibility
- June 27, 2025: Successfully implemented COM4 serial port connection - system now properly connects to real drone hardware on COM4 with 57600 baud rate, receiving live telemetry data including GPS position, attitude, and battery status
- June 27, 2025: Implemented cloud deployment compatibility - added network-based MAVLink connections (UDP/TCP) for cloud environments where serial ports are unavailable, created comprehensive deployment guide with connection options and troubleshooting
- June 27, 2025: Created development bridge solution - built com-bridge.js tool to forward local COM4 serial data to cloud environment via UDP, enabling real hardware testing during cloud development with simple `node com-bridge.js` command
- June 27, 2025: Implemented cloud bridge system - created cloud-bridge.js for HTTP-based connection from local hardware to cloud, added real-time bridge monitoring in Settings page, and comprehensive testing guides for verifying COM4 → cloud data flow
- June 27, 2025: Replaced "Focus Control" with "UAS Control Mode" - created comprehensive multi-drone interface with dropdown selection, telemetry monitoring (voltage, current, altitude, roll, pitch, yaw, heading), and Land/RTH command capabilities using real bridge data
- June 27, 2025: Implemented professional aviation-style AHRS viewer - replaced basic attitude display with Primary Flight Display (PFD) featuring artificial horizon, heading tape, altitude/speed tapes, aircraft symbol, pitch ladder, and real-time status panel matching commercial aviation HUD standards
- June 27, 2025: Successfully implemented QR code sharing functionality - added Share View and Fullscreen buttons to both Map and Dashboard pages, created QRDialog component with proper z-index layering, clipboard copy functionality, and user feedback toasts for seamless team collaboration
- June 27, 2025: Fixed fake drone data issue in UAS Control Mode - removed orphaned drone records from database, enhanced MAVLink service validation to only create drones for genuine hardware connections, improved connection status tracking to prevent fake online drones when no COM bridge is running
- June 27, 2025: Completely removed all fake node data - deleted all simulated Meshtastic nodes from database, disabled all simulation code in Meshtastic service, system now only processes real telemetry data from bridge connections, fixed Settings page BridgeMonitor component to handle separate mavlink/meshtastic status structure
- June 27, 2025: Enhanced Meshtastic bridge with comprehensive telemetry parsing - implemented advanced packet parsing based on official Meshtastic Web project structure, extracts real SNR/RSSI/node ID/voltage/position/hardware model data locally, sends structured telemetry over internet via enhanced bridge protocol, cloud app processes parsed data for accurate plotting and database updates with authentic node information
- June 29, 2025: Fixed serial port connection persistence in Nodes Control Mode - resolved issue where navigating between pages would show "Disconnected" status despite active COM port connection, added automatic connection detection and restoration on page load, improved serial port cleanup and status tracking for seamless user experience
- June 29, 2025: Resolved NodeDB storage bug - confirmed database storage functionality works perfectly, issue was authentication-related not data persistence, NodeDB data successfully saves to PostgreSQL with complete structured data including node details, configuration, messages, and metadata
- June 29, 2025: Implemented "Read Info" button in Nodes Control Mode - added comprehensive node information reading functionality similar to Meshtastic CLI `--info` command, displays hardware model, firmware version, battery status, position data, uptime, and device capabilities with structured logging and database storage

## User Preferences

Preferred communication style: Simple, everyday language.