import { EventEmitter } from 'events';
import { storage } from '../storage';
import type { InsertDrone } from '@shared/schema';

interface MAVLinkMessage {
  system_id: number;
  component_id: number;
  message_id: number;
  payload: any;
}

interface HeartbeatPayload {
  type: number;
  autopilot: number;
  base_mode: number;
  custom_mode: number;
  system_status: number;
  mavlink_version: number;
}

interface GlobalPositionIntPayload {
  time_boot_ms: number;
  lat: number;
  lon: number;
  alt: number;
  relative_alt: number;
  vx: number;
  vy: number;
  vz: number;
  hdg: number;
}

interface SysBatteryStatusPayload {
  id: number;
  battery_function: number;
  type: number;
  temperature: number;
  voltages: number[];
  current_battery: number;
  current_consumed: number;
  energy_consumed: number;
  battery_remaining: number;
}

interface GpsRawIntPayload {
  time_usec: number;
  fix_type: number;
  lat: number;
  lon: number;
  alt: number;
  eph: number;
  epv: number;
  vel: number;
  cog: number;
  satellites_visible: number;
}

class MAVLinkService extends EventEmitter {
  private connected = false;
  private connectionType: 'serial' | 'udp' | 'tcp' = 'udp';
  private connectionString = 'udp:127.0.0.1:14550';
  private connection: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private telemetryInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  async initialize() {
    try {
      console.log('Initializing MAVLink service...');
      
      // Load connection string from settings
      const { storage } = await import('../storage');
      const connectionSetting = await storage.getSetting('mavlinkConnection');
      if (connectionSetting) {
        this.connectionString = connectionSetting.value;
      }
      
      // In a real implementation, this would establish connection to drone
      // via serial, UDP, or TCP based on configuration
      await this.establishConnection();
      
      this.connected = true;
      this.startHeartbeat();
      this.startTelemetryUpdates();
      this.simulateDroneData(); // For development/demo
      
      console.log('MAVLink service initialized');
    } catch (error) {
      console.error('Failed to initialize MAVLink service:', error);
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async establishConnection() {
    // In a real implementation, this would:
    // 1. Create serial/UDP/TCP connection based on configuration
    // 2. Set up message parsing for MAVLink protocol
    // 3. Handle connection events
    
    console.log(`Connecting to drone via ${this.connectionString}`);
    
    // Parse connection string to determine type
    if (this.connectionString.startsWith('serial:') || this.connectionString.startsWith('COM')) {
      this.connectionType = 'serial';
    } else if (this.connectionString.startsWith('tcp:')) {
      this.connectionType = 'tcp';
    } else {
      this.connectionType = 'udp';
    }
    
    // Simulate connection establishment
    this.connection = { connected: true, connectionString: this.connectionString };
  }

  async updateConnection(connectionString: string) {
    try {
      console.log(`Updating MAVLink connection to: ${connectionString}`);
      
      // Disconnect current connection
      await this.disconnect();
      
      // Update connection string
      this.connectionString = connectionString;
      
      // Reconnect with new settings
      await this.establishConnection();
      
      this.connected = true;
      this.startHeartbeat();
      this.startTelemetryUpdates();
      
      console.log('MAVLink connection updated successfully');
    } catch (error) {
      console.error('Failed to update MAVLink connection:', error);
      this.connected = false;
      throw error;
    }
  }

  async sendCommand(droneId: number, command: string, parameters?: any): Promise<any> {
    if (!this.connected) {
      throw new Error('MAVLink not connected');
    }

    try {
      console.log(`Sending command to drone ${droneId}: ${command}`, parameters);
      
      switch (command) {
        case 'arm':
          return await this.armDisarm(droneId, true);
        case 'disarm':
          return await this.armDisarm(droneId, false);
        case 'takeoff':
          return await this.takeoff(droneId, parameters?.altitude || 10);
        case 'land':
          return await this.land(droneId);
        case 'rtl':
          return await this.returnToLaunch(droneId);
        case 'goto':
          return await this.gotoLocation(droneId, parameters);
        case 'set_mode':
          return await this.setFlightMode(droneId, parameters?.mode);
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error('Failed to send MAVLink command:', error);
      throw error;
    }
  }

  private async armDisarm(droneId: number, arm: boolean): Promise<void> {
    // In a real implementation, send MAV_CMD_COMPONENT_ARM_DISARM
    console.log(`${arm ? 'Arming' : 'Disarming'} drone ${droneId}`);
    
    // Update drone status in database
    const drone = await storage.getDrone(droneId);
    if (drone) {
      await storage.updateDroneTelemetry(droneId, { armed: arm });
    }
    
    this.emit('commandResult', { droneId, command: arm ? 'arm' : 'disarm', success: true });
  }

  private async takeoff(droneId: number, altitude: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_TAKEOFF
    console.log(`Takeoff command for drone ${droneId} to ${altitude}m`);
    
    // Update drone flight mode
    await storage.updateDroneTelemetry(droneId, { 
      flightMode: 'TAKEOFF',
      armed: true 
    });
    
    this.emit('commandResult', { droneId, command: 'takeoff', success: true });
  }

  private async land(droneId: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_LAND
    console.log(`Land command for drone ${droneId}`);
    
    await storage.updateDroneTelemetry(droneId, { flightMode: 'LAND' });
    
    this.emit('commandResult', { droneId, command: 'land', success: true });
  }

  private async returnToLaunch(droneId: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_RETURN_TO_LAUNCH
    console.log(`Return to launch command for drone ${droneId}`);
    
    await storage.updateDroneTelemetry(droneId, { flightMode: 'RTL' });
    
    this.emit('commandResult', { droneId, command: 'rtl', success: true });
  }

  private async gotoLocation(droneId: number, location: { lat: number; lon: number; alt: number }): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_WAYPOINT
    console.log(`Goto command for drone ${droneId}:`, location);
    
    await storage.updateDroneTelemetry(droneId, { flightMode: 'GUIDED' });
    
    this.emit('commandResult', { droneId, command: 'goto', success: true });
  }

  private async setFlightMode(droneId: number, mode: string): Promise<void> {
    // In a real implementation, send MAV_CMD_DO_SET_MODE
    console.log(`Setting flight mode for drone ${droneId} to ${mode}`);
    
    await storage.updateDroneTelemetry(droneId, { flightMode: mode });
    
    this.emit('commandResult', { droneId, command: 'set_mode', success: true });
  }

  private async handleMAVLinkMessage(message: MAVLinkMessage) {
    try {
      switch (message.message_id) {
        case 0: // HEARTBEAT
          await this.handleHeartbeat(message);
          break;
        case 33: // GLOBAL_POSITION_INT
          await this.handleGlobalPositionInt(message);
          break;
        case 147: // BATTERY_STATUS
          await this.handleBatteryStatus(message);
          break;
        case 24: // GPS_RAW_INT
          await this.handleGpsRawInt(message);
          break;
      }

      this.emit('mavlinkMessage', message);
    } catch (error) {
      console.error('Error handling MAVLink message:', error);
    }
  }

  private async handleHeartbeat(message: MAVLinkMessage) {
    const payload: HeartbeatPayload = message.payload;
    const systemId = message.system_id;
    
    // Ensure drone exists in database
    let drone = await storage.getDrone(systemId);
    if (!drone) {
      const newDroneData: InsertDrone = {
        name: `UAV-${systemId.toString().padStart(2, '0')}`,
        serialNumber: `SN${systemId}${Date.now()}`,
        model: this.getAutopilotName(payload.autopilot),
        isConnected: true,
      };
      drone = await storage.upsertDrone(newDroneData);
    }

    // Update drone status
    await storage.updateDroneTelemetry(systemId, {
      flightMode: this.getFlightModeName(payload.base_mode, payload.custom_mode),
      armed: (payload.base_mode & 128) !== 0, // MAV_MODE_FLAG_SAFETY_ARMED
      isConnected: true,
    });

    this.emit('heartbeat', { systemId, payload });
  }

  private async handleGlobalPositionInt(message: MAVLinkMessage) {
    const payload: GlobalPositionIntPayload = message.payload;
    const systemId = message.system_id;
    
    await storage.updateDroneTelemetry(systemId, {
      latitude: payload.lat / 1e7,
      longitude: payload.lon / 1e7,
      altitude: payload.alt / 1000,
      altitudeRelative: payload.relative_alt / 1000,
      groundSpeed: Math.sqrt(payload.vx * payload.vx + payload.vy * payload.vy) / 100,
      heading: payload.hdg / 100,
    });

    this.emit('positionUpdate', { systemId, position: payload });
  }

  private async handleBatteryStatus(message: MAVLinkMessage) {
    const payload: SysBatteryStatusPayload = message.payload;
    const systemId = message.system_id;
    
    await storage.updateDroneTelemetry(systemId, {
      batteryLevel: payload.battery_remaining,
      voltage: payload.voltages[0] / 1000, // Convert from mV to V
    });

    this.emit('batteryUpdate', { systemId, battery: payload });
  }

  private async handleGpsRawInt(message: MAVLinkMessage) {
    const payload: GpsRawIntPayload = message.payload;
    const systemId = message.system_id;
    
    await storage.updateDroneTelemetry(systemId, {
      gpsFixType: payload.fix_type,
      satelliteCount: payload.satellites_visible,
    });

    this.emit('gpsUpdate', { systemId, gps: payload });
  }

  private getAutopilotName(autopilot: number): string {
    const autopilots = {
      0: 'Generic',
      3: 'ArduPilot',
      4: 'OpenPilot',
      12: 'PX4',
    };
    return autopilots[autopilot as keyof typeof autopilots] || 'Unknown';
  }

  private getFlightModeName(baseMode: number, customMode: number): string {
    // This is simplified - in reality, flight modes depend on the autopilot type
    const modes = {
      0: 'STABILIZE',
      1: 'ACRO',
      2: 'ALT_HOLD',
      3: 'AUTO',
      4: 'GUIDED',
      5: 'LOITER',
      6: 'RTL',
      7: 'CIRCLE',
      9: 'LAND',
      16: 'POSHOLD',
      17: 'BRAKE',
      18: 'THROW',
      19: 'AVOID_ADSB',
      20: 'GUIDED_NOGPS',
    };
    return modes[customMode as keyof typeof modes] || 'UNKNOWN';
  }

  private async startHeartbeat() {
    // Load heartbeat interval from settings (default to 30 seconds to reduce log spam)
    const { storage } = await import('../storage');
    const heartbeatSetting = await storage.getSetting('mavlinkHeartbeat');
    const heartbeatInterval = heartbeatSetting ? parseInt(heartbeatSetting.value) * 1000 : 30000;
    
    this.heartbeatInterval = setInterval(() => {
      // In a real implementation, send heartbeat to maintain connection
      // Only log every 10th heartbeat to reduce spam
      if (Date.now() % (heartbeatInterval * 10) < heartbeatInterval) {
        console.log('MAVLink heartbeat active');
      }
    }, heartbeatInterval);
  }

  private startTelemetryUpdates() {
    this.telemetryInterval = setInterval(async () => {
      try {
        const drones = await storage.getAllDrones();
        const now = new Date();
        
        // Mark drones as disconnected if no telemetry for 10 seconds
        for (const drone of drones) {
          if (drone.lastTelemetry && (now.getTime() - drone.lastTelemetry.getTime()) > 10000) {
            await storage.updateDroneTelemetry(drone.id, { isConnected: false });
          }
        }
      } catch (error) {
        console.error('Error updating drone connection status:', error);
      }
    }, 5000);
  }

  private simulateDroneData() {
    // This simulates real drone telemetry for development
    if (process.env.NODE_ENV === 'development') {
      let lat = 37.7749; // San Francisco
      let lon = -122.4194;
      let alt = 100;
      
      setInterval(async () => {
        // Simulate drone movement
        lat += (Math.random() - 0.5) * 0.001;
        lon += (Math.random() - 0.5) * 0.001;
        alt += (Math.random() - 0.5) * 10;
        
        const message: MAVLinkMessage = {
          system_id: 1,
          component_id: 1,
          message_id: 33, // GLOBAL_POSITION_INT
          payload: {
            time_boot_ms: Date.now(),
            lat: Math.round(lat * 1e7),
            lon: Math.round(lon * 1e7),
            alt: Math.round(alt * 1000),
            relative_alt: Math.round((alt - 50) * 1000),
            vx: Math.round((Math.random() - 0.5) * 1000),
            vy: Math.round((Math.random() - 0.5) * 1000),
            vz: Math.round((Math.random() - 0.5) * 100),
            hdg: Math.round(Math.random() * 36000),
          }
        };

        await this.handleMAVLinkMessage(message);
      }, 2000);

      // Simulate battery updates
      setInterval(async () => {
        const batteryLevel = Math.max(0, Math.min(100, 85 + (Math.random() - 0.5) * 20));
        const voltage = 14.4 + (Math.random() - 0.5) * 2;
        
        const message: MAVLinkMessage = {
          system_id: 1,
          component_id: 1,
          message_id: 147, // BATTERY_STATUS
          payload: {
            id: 0,
            battery_function: 0,
            type: 1,
            temperature: 25,
            voltages: [Math.round(voltage * 1000), -1, -1, -1, -1, -1, -1, -1, -1, -1],
            current_battery: 1500,
            current_consumed: 2000,
            energy_consumed: -1,
            battery_remaining: batteryLevel,
          }
        };

        await this.handleMAVLinkMessage(message);
      }, 5000);
    }
  }

  async disconnect() {
    this.connected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    if (this.connection) {
      // In a real implementation, close the connection
      this.connection = null;
    }

    console.log('MAVLink service disconnected');
  }
}

export const mavlinkService = new MAVLinkService();
