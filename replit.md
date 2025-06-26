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

## User Preferences

Preferred communication style: Simple, everyday language.