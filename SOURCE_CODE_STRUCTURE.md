# MeshTac Source Code Structure

## Project Overview

MeshTac is a full-stack web application for Search and Rescue (SAR) operations, featuring real-time communication through Meshtastic mesh networks and drone control via MAVLink integration. The application is built with React frontend, Express backend, and PostgreSQL database.

## Directory Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries and configurations
│   │   ├── pages/          # Application pages/routes
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main application component
│   │   ├── index.css       # Global styles
│   │   └── main.tsx        # Application entry point
│   └── index.html          # HTML template
├── server/                 # Express backend application
│   ├── services/           # Business logic services
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database operations interface
│   ├── db.ts               # Database connection setup
│   ├── replitAuth.ts       # Authentication middleware
│   └── vite.ts             # Development server configuration
├── shared/                 # Shared code between client and server
│   └── schema.ts           # Database schema and types
├── components.json         # shadcn/ui component configuration
├── drizzle.config.ts       # Database migration configuration
├── package.json            # Project dependencies and scripts
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
└── replit.md               # Project documentation and preferences
```

## Frontend Architecture (`client/`)

### Main Application Files

**`client/src/App.tsx`**
- Main application component with routing logic
- Handles authentication state management
- Route protection based on user authentication
- Implements conditional rendering for authenticated/unauthenticated users

**`client/src/main.tsx`**
- Application entry point
- Sets up React Query client for server state management
- Mounts the main App component

**`client/src/index.css`**
- Global CSS styles and Tailwind configuration
- CSS custom properties for theming
- Light theme configuration (changed from dark theme)

### Components (`client/src/components/`)
- Reusable UI components built with shadcn/ui
- Form components, buttons, cards, navigation elements
- Custom components for drone control, mapping, and communication

### Hooks (`client/src/hooks/`)

**`useAuth.ts`**
- Manages user authentication state
- Provides login status and user information
- Integrates with React Query for server state

**`useDrone.ts`**
- Manages drone data and operations
- Provides connected drone information
- Handles drone selection and filtering

**`useNodes.ts`**
- Manages Meshtastic node data
- Provides node status and communication capabilities

**`useWebSocket.ts`**
- Handles real-time WebSocket connections
- Manages connection state and message handling
- Provides real-time updates for nodes, drones, and messages

**`use-toast.ts`**
- Toast notification system
- Manages notification state and display

### Library Code (`client/src/lib/`)

**`queryClient.ts`**
- React Query configuration
- API request utilities with error handling
- Authentication-aware request handling

**`authUtils.ts`**
- Authentication utility functions
- Error detection and handling

**`utils.ts`**
- General utility functions
- Tailwind CSS class merging

### Pages (`client/src/pages/`)

**`landing.tsx`**
- Landing page for non-authenticated users
- Login prompts and application overview

**`dashboard.tsx`**
- Main dashboard with system overview
- Status displays for nodes, drones, and messages
- Real-time statistics and monitoring

**`communications.tsx`**
- Meshtastic communication interface
- Message history and sending capabilities
- Role-based access control

**`drone-control.tsx`**
- MAVLink drone control interface
- Flight controls and telemetry display
- Connection status and troubleshooting

**`map.tsx`**
- Tactical mapping interface
- Real-time position tracking
- Interactive map controls

**`mission-planning.tsx`**
- Mission creation and management
- Flight planning tools

**`settings.tsx`**
- System configuration interface
- MAVLink and Meshtastic settings
- User preferences and role management

**`team-management.tsx`**
- User and role management
- Team coordination features

## Backend Architecture (`server/`)

### Main Server Files

**`server/index.ts`**
- Express server setup and initialization
- Middleware configuration
- Error handling and logging
- Server startup and port binding

**`server/routes.ts`**
- API endpoint definitions
- Route handlers for all application features
- Authentication middleware integration
- Role-based access control implementation

**`server/storage.ts`**
- Database operations interface (IStorage)
- DatabaseStorage implementation with Drizzle ORM
- CRUD operations for all data entities
- Data validation and error handling

**`server/db.ts`**
- Database connection configuration
- Neon Database serverless setup
- Drizzle ORM initialization

**`server/replitAuth.ts`**
- Replit Auth integration
- OpenID Connect configuration
- Session management
- User authentication and authorization

**`server/vite.ts`**
- Development server configuration
- Hot module replacement setup
- Static file serving

### Services (`server/services/`)

**`mavlink.ts`**
- MAVLink protocol implementation
- Drone communication and control
- Real-time telemetry processing
- Connection management and status monitoring
- Support for both real devices and simulation

**`meshtastic.ts`**
- Meshtastic mesh network integration
- Node discovery and communication
- Message routing and handling
- Device status monitoring

**`websocket.ts`**
- WebSocket server implementation
- Real-time communication hub
- Event broadcasting to connected clients
- Client connection management

## Shared Code (`shared/`)

**`schema.ts`**
- Database schema definitions using Drizzle ORM
- TypeScript types for all data entities
- Validation schemas using Zod
- Relationship definitions between entities

### Key Data Entities:
- **Users**: Authentication and role management
- **Nodes**: Meshtastic device information
- **Messages**: Communication history
- **Drones**: MAVLink drone data
- **Missions**: Flight planning and execution
- **SharedMaps**: Collaborative mapping
- **Settings**: System configuration

## Configuration Files

**`package.json`**
- Project dependencies and scripts
- Build and development commands
- Package metadata

**`tsconfig.json`**
- TypeScript compiler configuration
- Path aliases and module resolution
- Strict type checking settings

**`tailwind.config.ts`**
- Tailwind CSS configuration
- Custom color scheme and theming
- Component styling presets

**`vite.config.ts`**
- Vite bundler configuration
- Plugin setup and optimization
- Development server settings

**`drizzle.config.ts`**
- Database migration configuration
- Schema generation settings

## Key Features Implementation

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions
- **Role-based Access**: Three-tier system (admin, user, watcher)
- **Security**: JWT tokens and secure cookie handling

### Real-time Communication
- **WebSocket Server**: Bidirectional communication
- **Event Broadcasting**: Live updates for all connected clients
- **Message Types**: Node updates, drone telemetry, communication messages

### MAVLink Integration
- **Protocol Support**: Full MAVLink message handling
- **Device Management**: Connection detection and monitoring
- **Telemetry Processing**: Real-time flight data
- **Command Interface**: Drone control capabilities

### Meshtastic Integration
- **Mesh Networking**: Node discovery and communication
- **Message Handling**: Text and position updates
- **Device Monitoring**: Status and telemetry tracking

### Database Design
- **ORM**: Drizzle with PostgreSQL
- **Type Safety**: Full TypeScript integration
- **Relationships**: Comprehensive entity associations
- **Validation**: Zod schema validation

## Development Workflow

### Build Process
1. **Frontend**: Vite builds React application to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle handles schema migrations

### Development Server
- **Hot Reload**: Vite development server with HMR
- **API Proxy**: Integrated frontend/backend development
- **Database**: Automatic PostgreSQL provisioning

### Deployment
- **Platform**: Replit autoscale deployment
- **Environment**: Production PostgreSQL with connection pooling
- **Configuration**: Environment-based settings management

## Code Quality Standards

### TypeScript
- Strict type checking enabled
- Comprehensive type definitions
- Interface-based architecture

### Error Handling
- Consistent error responses
- User-friendly error messages
- Logging and monitoring

### Security
- Role-based access control
- Input validation and sanitization
- Secure authentication flow

This structure provides a comprehensive, scalable foundation for SAR operations with real-time communication, drone control, and collaborative mapping capabilities.