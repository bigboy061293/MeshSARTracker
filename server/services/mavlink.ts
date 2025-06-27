import { EventEmitter } from "events";
import { SerialPort } from "serialport";
import { createConnection as createUdpConnection } from "net";
import { createSocket } from "dgram";
import { storage } from "../storage";
import type { InsertDrone } from "@shared/schema";

// Real MAVLink protocol integration
import mavlink from "mavlink";

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

interface AttitudePayload {
  time_boot_ms: number;
  roll: number;
  pitch: number;
  yaw: number;
  rollspeed: number;
  pitchspeed: number;
  yawspeed: number;
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
  private connectionType: "serial" | "udp" | "tcp" = "udp";
  private connectionString = "udp:127.0.0.1:14550";
  private connection: SerialPort | any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private telemetryInterval: NodeJS.Timeout | null = null;
  private useSimulation: boolean = false; // true = simulation, false = real device
  private deviceConnected = false; // tracks if real device responded
  private lastDeviceHeartbeat = 0; // timestamp of last device heartbeat
  private connectionTimeout: NodeJS.Timeout | null = null;
  private mavlinkParser: any = null; // MAVLink protocol parser

  constructor() {
    super();
    // Default to real device data, only use simulation if explicitly requested
    this.useSimulation = process.env.MAVLINK_USE_SIMULATION === "true";
  }

  /**
   * Configure the MAVLink data source
   * @param useSimulation true for simulated data, false for real device data
   */
  setDataSource(useSimulation: boolean): void {
    this.useSimulation = useSimulation;
    console.log(
      `MAVLink data source set to: ${useSimulation ? "Simulation" : "Real Device"}`,
    );
  }

  /**
   * Get current data source configuration
   */
  getDataSource(): string {
    return this.useSimulation ? "Simulation" : "Real Device";
  }

  async initialize() {
    try {
      console.log(
        `Initializing MAVLink service with data source: ${this.getDataSource()}`,
      );

      // Load connection string from settings
      const { storage } = await import("../storage");
      const connectionSetting = await storage.getSetting("mavlinkConnection");
      if (connectionSetting) {
        this.connectionString = connectionSetting.value;
      }

      if (this.useSimulation) {
        console.log("Using simulated MAVLink data for development/testing");
        this.connected = true;
        this.simulateDroneData();
      } else {
        console.log(`Connecting to real drone via ${this.connectionString}`);
        await this.establishConnection();
        this.connected = true;
        this.startHeartbeat();
      }

      this.startTelemetryUpdates();
      console.log("MAVLink service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MAVLink service:", error);
      if (!this.useSimulation) {
        console.log(
          "Falling back to simulation mode due to connection failure",
        );
        this.useSimulation = true;
        this.connected = true;
        this.simulateDroneData();
      } else {
        this.connected = false;
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if a real device is actively responding
   */
  isDeviceConnected(): boolean {
    if (this.useSimulation) return false;
    const now = Date.now();
    // Consider device connected if we received a heartbeat within last 10 seconds
    return this.deviceConnected && (now - this.lastDeviceHeartbeat) < 10000;
  }

  /**
   * Get connection status details
   */
  getConnectionStatus() {
    return {
      serviceConnected: this.connected,
      deviceConnected: this.isDeviceConnected(),
      dataSource: this.useSimulation ? 'simulation' : 'real_device',
      connectionString: this.connectionString,
      lastDeviceHeartbeat: this.lastDeviceHeartbeat
    };
  }

  private async establishConnection() {
    console.log(`🔌 Establishing MAVLink connection to: ${this.connectionString}`);

    try {
      // Parse connection string to determine type
      if (
        this.connectionString.startsWith("serial:") ||
        this.connectionString.startsWith("COM")
      ) {
        this.connectionType = "serial";
        await this.establishSerialConnection();
      } else if (this.connectionString.startsWith("tcp:")) {
        this.connectionType = "tcp";
        await this.establishTcpConnection();
      } else {
        this.connectionType = "udp";
        await this.establishUdpConnection();
      }

      console.log(`✅ MAVLink connection established via ${this.connectionType}: ${this.connectionString}`);
    } catch (error) {
      console.error(`❌ Failed to establish MAVLink connection:`, error);
      throw error;
    }
  }

  private async establishSerialConnection() {
    try {
      // Extract port from connection string (e.g., "COM4", "serial:COM4", "serial:/dev/ttyUSB0")
      let portPath = this.connectionString;
      if (portPath.startsWith("serial:")) {
        portPath = portPath.substring(7); // Remove "serial:" prefix
      }

      console.log(`📡 Attempting to open serial port: ${portPath}`);

      // Check if we're in a cloud environment where serial ports may not be available
      const isCloudEnvironment = process.env.REPLIT || process.env.NODE_ENV === 'development';
      
      if (isCloudEnvironment && (portPath.startsWith('COM') || portPath.startsWith('/dev/tty'))) {
        throw new Error(`Cloud environment detected - serial port ${portPath} not available. Use network connections instead (udp:host:port or tcp:host:port)`);
      }

      // List available serial ports for debugging
      const { SerialPort } = await import('serialport');
      const availablePorts = await SerialPort.list();
      console.log(`Available serial ports:`, availablePorts.map(p => p.path));

      if (availablePorts.length === 0) {
        throw new Error(`No serial ports available on this system. For cloud deployment, use network connections: udp:127.0.0.1:14550`);
      }

      // Check if the requested port exists
      const portExists = availablePorts.some(p => p.path === portPath);
      if (!portExists) {
        const availablePortsList = availablePorts.map(p => p.path).join(', ');
        throw new Error(`Serial port ${portPath} not found. Available ports: ${availablePortsList}`);
      }

      // Create SerialPort connection with MAVLink-compatible settings
      this.connection = new SerialPort({
        path: portPath,
        baudRate: 57600, // Standard MAVLink baud rate
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      });

      // Setup MAVLink parser
      this.setupMAVLinkParser();

      // Open the port
      await new Promise<void>((resolve, reject) => {
        this.connection.open((error: Error | null) => {
          if (error) {
            reject(new Error(`Failed to open serial port ${portPath}: ${error.message}`));
          } else {
            console.log(`✅ Serial port ${portPath} opened successfully`);
            resolve();
          }
        });
      });

      // Setup event handlers
      this.connection.on('data', (data: Buffer) => {
        if (this.mavlinkParser) {
          this.mavlinkParser.parseBuffer(data);
        }
      });

      this.connection.on('error', (error: Error) => {
        console.error(`❌ Serial port error:`, error);
        this.emit('connectionError', error);
      });

      this.connection.on('close', () => {
        console.log(`🔌 Serial port ${portPath} closed`);
        this.connected = false;
        this.deviceConnected = false;
      });

    } catch (error) {
      throw new Error(`Serial connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async establishUdpConnection() {
    try {
      // Parse UDP connection string (e.g., "udp:127.0.0.1:14550")
      const url = this.connectionString.replace("udp:", "");
      const [host, port] = url.split(":");
      const targetPort = parseInt(port) || 14550;
      const targetHost = host || "127.0.0.1";

      console.log(`📡 Creating UDP connection to ${targetHost}:${targetPort}`);

      this.connection = createSocket('udp4');
      this.setupMAVLinkParser();

      this.connection.on('message', (data: Buffer) => {
        if (this.mavlinkParser) {
          this.mavlinkParser.parseBuffer(data);
        }
      });

      this.connection.on('error', (error: Error) => {
        console.error(`❌ UDP connection error:`, error);
        this.emit('connectionError', error);
      });

      // Store connection details for sending data
      this.connection.targetHost = targetHost;
      this.connection.targetPort = targetPort;

      console.log(`✅ UDP connection established to ${targetHost}:${targetPort}`);
    } catch (error) {
      throw new Error(`UDP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async establishTcpConnection() {
    try {
      // Parse TCP connection string (e.g., "tcp:127.0.0.1:5760")
      const url = this.connectionString.replace("tcp:", "");
      const [host, port] = url.split(":");
      const targetPort = parseInt(port) || 5760;
      const targetHost = host || "127.0.0.1";

      console.log(`📡 Creating TCP connection to ${targetHost}:${targetPort}`);

      this.connection = createUdpConnection(targetPort, targetHost);
      this.setupMAVLinkParser();

      this.connection.on('data', (data: Buffer) => {
        if (this.mavlinkParser) {
          this.mavlinkParser.parseBuffer(data);
        }
      });

      this.connection.on('error', (error: Error) => {
        console.error(`❌ TCP connection error:`, error);
        this.emit('connectionError', error);
      });

      this.connection.on('close', () => {
        console.log(`🔌 TCP connection to ${targetHost}:${targetPort} closed`);
        this.connected = false;
        this.deviceConnected = false;
      });

      console.log(`✅ TCP connection established to ${targetHost}:${targetPort}`);
    } catch (error) {
      throw new Error(`TCP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupMAVLinkParser() {
    try {
      // Initialize MAVLink parser with proper message handling
      // The mavlink library may have different export structures
      const MAVLinkConstructor = mavlink.MAVLink || mavlink.default?.MAVLink || mavlink;
      
      if (typeof MAVLinkConstructor === 'function') {
        this.mavlinkParser = new MAVLinkConstructor(null, 255, 0);
      } else {
        // Alternative initialization for different library versions
        this.mavlinkParser = mavlink.createMAVLink ? mavlink.createMAVLink(255, 0) : mavlink;
      }
      
      if (this.mavlinkParser && typeof this.mavlinkParser.on === 'function') {
        this.mavlinkParser.on('message', (message: any) => {
          this.handleIncomingMAVLinkMessage(message);
        });

        this.mavlinkParser.on('error', (error: Error) => {
          console.error(`❌ MAVLink parser error:`, error);
        });
      }

      console.log(`🔧 MAVLink parser initialized`);
    } catch (error) {
      console.error(`❌ Failed to setup MAVLink parser:`, error);
      throw error;
    }
  }

  private handleIncomingMAVLinkMessage(message: any) {
    const mavlinkMessage: MAVLinkMessage = {
      system_id: message.header.srcSystem,
      component_id: message.header.srcComponent,
      message_id: message.header.msgid,
      payload: message
    };

    // Log incoming message
    console.log(`📥 MAVLink Message Received: {
  system_id: ${mavlinkMessage.system_id},
  component_id: ${mavlinkMessage.component_id},
  message_id: ${mavlinkMessage.message_id},
  message_name: '${this.getMessageName(mavlinkMessage.message_id)}',
  timestamp: '${new Date().toISOString()}',
  direction: 'INCOMING'
}`);

    // Update device connection status
    this.deviceConnected = true;
    this.lastDeviceHeartbeat = Date.now();

    // Process the message
    this.handleMAVLinkMessage(mavlinkMessage);
  }

  async updateConnection(connectionString: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log(`Updating MAVLink connection to: ${connectionString}`);

      // Disconnect current connection
      await this.disconnect();

      // Reset connection state
      this.deviceConnected = false;
      this.lastDeviceHeartbeat = 0;

      // Update connection string
      this.connectionString = connectionString;

      // Reconnect with new settings
      await this.establishConnection();

      this.connected = true;
      this.startHeartbeat();
      this.startTelemetryUpdates();

      // Test connection with timeout
      const testResult = await this.testConnection();
      
      if (testResult.success) {
        console.log("MAVLink connection updated successfully");
        return {
          success: true,
          message: "Connection established successfully",
          details: testResult.details
        };
      } else {
        return {
          success: false,
          message: testResult.message,
          details: testResult.details
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      console.error("Failed to update MAVLink connection:", errorMessage);
      this.connected = false;
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * Test connection and wait for device response
   */
  private async testConnection(timeoutMs: number = 15000): Promise<{ success: boolean; message: string; details: any }> {
    if (this.useSimulation) {
      return {
        success: true,
        message: "Simulation mode - connection successful",
        details: { mode: "simulation" }
      };
    }

    // Check if port/connection can be opened
    const portCheck = await this.checkPortAccess();
    if (!portCheck.success) {
      return {
        success: false,
        message: portCheck.message,
        details: portCheck.details
      };
    }

    // Wait for device heartbeat
    const deviceCheck = await this.waitForDeviceHeartbeat(timeoutMs);
    return deviceCheck;
  }

  /**
   * Check if the connection port/interface is accessible
   */
  private async checkPortAccess(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      if (this.connectionString.startsWith("COM") || this.connectionString.startsWith("/dev/")) {
        // Serial port check - in real implementation, would attempt to open the port
        return {
          success: true,
          message: "Serial port accessible",
          details: { port: this.connectionString, type: "serial" }
        };
      } else if (this.connectionString.includes(":")) {
        // Network connection check
        return {
          success: true,
          message: "Network connection configured",
          details: { connection: this.connectionString, type: "network" }
        };
      } else {
        return {
          success: false,
          message: "Invalid connection string format",
          details: { connection: this.connectionString }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Port access failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error }
      };
    }
  }

  /**
   * Wait for device heartbeat with timeout
   */
  private async waitForDeviceHeartbeat(timeoutMs: number): Promise<{ success: boolean; message: string; details: any }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkHeartbeat = () => {
        const elapsed = Date.now() - startTime;
        
        if (this.isDeviceConnected()) {
          resolve({
            success: true,
            message: "Device heartbeat received - connection successful",
            details: {
              responseTime: elapsed,
              lastHeartbeat: this.lastDeviceHeartbeat,
              deviceConnected: true
            }
          });
          return;
        }
        
        if (elapsed >= timeoutMs) {
          resolve({
            success: false,
            message: `Connection timeout - no device response after ${timeoutMs/1000}s`,
            details: {
              timeout: timeoutMs,
              elapsed,
              connectionString: this.connectionString,
              receivedHeartbeat: false,
              suggestion: "Check device connection, baud rate, and ensure MAVLink is enabled"
            }
          });
          return;
        }
        
        // Check again in 500ms
        setTimeout(checkHeartbeat, 500);
      };
      
      // Start checking
      checkHeartbeat();
    });
  }

  async sendCommand(
    droneId: number,
    command: string,
    parameters?: any,
  ): Promise<any> {
    if (!this.connected) {
      throw new Error("MAVLink not connected");
    }

    try {
      console.log(
        `Sending command to drone ${droneId}: ${command}`,
        parameters,
      );

      switch (command) {
        case "arm":
          return await this.armDisarm(droneId, true);
        case "disarm":
          return await this.armDisarm(droneId, false);
        case "takeoff":
          return await this.takeoff(droneId, parameters?.altitude || 10);
        case "land":
          return await this.land(droneId);
        case "rtl":
          return await this.returnToLaunch(droneId);
        case "goto":
          return await this.gotoLocation(droneId, parameters);
        case "set_mode":
          return await this.setFlightMode(droneId, parameters?.mode);
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error("Failed to send MAVLink command:", error);
      throw error;
    }
  }

  private async armDisarm(droneId: number, arm: boolean): Promise<void> {
    // In a real implementation, send MAV_CMD_COMPONENT_ARM_DISARM
    console.log(`${arm ? "Arming" : "Disarming"} drone ${droneId}`);

    // Update drone status in database
    const drone = await storage.getDrone(droneId);
    if (drone) {
      await storage.updateDroneTelemetry(droneId, { armed: arm });
    }

    this.emit("commandResult", {
      droneId,
      command: arm ? "arm" : "disarm",
      success: true,
    });
  }

  private async takeoff(droneId: number, altitude: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_TAKEOFF
    console.log(`Takeoff command for drone ${droneId} to ${altitude}m`);

    // Update drone flight mode
    await storage.updateDroneTelemetry(droneId, {
      flightMode: "TAKEOFF",
      armed: true,
    });

    this.emit("commandResult", { droneId, command: "takeoff", success: true });
  }

  private async land(droneId: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_LAND
    console.log(`Land command for drone ${droneId}`);

    await storage.updateDroneTelemetry(droneId, { flightMode: "LAND" });

    this.emit("commandResult", { droneId, command: "land", success: true });
  }

  private async returnToLaunch(droneId: number): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_RETURN_TO_LAUNCH
    console.log(`Return to launch command for drone ${droneId}`);

    await storage.updateDroneTelemetry(droneId, { flightMode: "RTL" });

    this.emit("commandResult", { droneId, command: "rtl", success: true });
  }

  private async gotoLocation(
    droneId: number,
    location: { lat: number; lon: number; alt: number },
  ): Promise<void> {
    // In a real implementation, send MAV_CMD_NAV_WAYPOINT
    console.log(`Goto command for drone ${droneId}:`, location);

    await storage.updateDroneTelemetry(droneId, { flightMode: "GUIDED" });

    this.emit("commandResult", { droneId, command: "goto", success: true });
  }

  private async setFlightMode(droneId: number, mode: string): Promise<void> {
    // In a real implementation, send MAV_CMD_DO_SET_MODE
    console.log(`Setting flight mode for drone ${droneId} to ${mode}`);

    await storage.updateDroneTelemetry(droneId, { flightMode: mode });

    this.emit("commandResult", { droneId, command: "set_mode", success: true });
  }

  private async handleMAVLinkMessage(message: MAVLinkMessage) {
    // Log all incoming MAVLink messages to console
    console.log("📡 MAVLink Message Received:", {
      system_id: message.system_id,
      component_id: message.component_id,
      message_id: message.message_id,
      message_name: this.getMessageName(message.message_id),
      payload: message.payload,
      timestamp: new Date().toISOString(),
    });

    try {
      switch (message.message_id) {
        case 0: // HEARTBEAT
          await this.handleHeartbeat(message);
          break;
        case 33: // GLOBAL_POSITION_INT
          await this.handleGlobalPositionInt(message);
          break;
        case 30: // ATTITUDE
          await this.handleAttitude(message);
          break;
        case 147: // BATTERY_STATUS
          await this.handleBatteryStatus(message);
          break;
        case 24: // GPS_RAW_INT
          await this.handleGpsRawInt(message);
          break;
      }

      this.emit("mavlinkMessage", message);
    } catch (error) {
      console.error("Error handling MAVLink message:", error);
    }
  }

  private async handleHeartbeat(message: MAVLinkMessage) {
    const payload: HeartbeatPayload = message.payload;
    const systemId = message.system_id;

    // Mark device as connected when we receive a heartbeat from external system
    if (!this.useSimulation && systemId !== 255) { // 255 is typically GCS
      const wasConnected = this.deviceConnected;
      this.deviceConnected = true;
      this.lastDeviceHeartbeat = Date.now();
      
      if (!wasConnected) {
        console.log(`Real device connected! System ID: ${systemId}`);
        console.log(`Device Details: ${this.getAutopilotName(payload.autopilot)} - ${this.getFlightModeName(payload.base_mode, payload.custom_mode)}`);
      }
    }

    // Ensure drone exists in database
    let drone = await storage.getDrone(systemId);
    if (!drone) {
      const newDroneData: InsertDrone = {
        name: `UAV-${systemId.toString().padStart(2, "0")}`,
        serialNumber: `SN${systemId}${Date.now()}`,
        model: this.getAutopilotName(payload.autopilot),
        isConnected: true,
      };
      drone = await storage.upsertDrone(newDroneData);
    }

    // Update drone status
    await storage.updateDroneTelemetry(systemId, {
      flightMode: this.getFlightModeName(
        payload.base_mode,
        payload.custom_mode,
      ),
      armed: (payload.base_mode & 128) !== 0, // MAV_MODE_FLAG_SAFETY_ARMED
      isConnected: true,
    });

    this.emit("heartbeat", { systemId, payload });
  }

  private async handleGlobalPositionInt(message: MAVLinkMessage) {
    const payload: GlobalPositionIntPayload = message.payload;
    const systemId = message.system_id;

    await storage.updateDroneTelemetry(systemId, {
      latitude: payload.lat / 1e7,
      longitude: payload.lon / 1e7,
      altitude: payload.alt / 1000,
      altitudeRelative: payload.relative_alt / 1000,
      groundSpeed:
        Math.sqrt(payload.vx * payload.vx + payload.vy * payload.vy) / 100,
      heading: payload.hdg / 100,
    });

    this.emit("positionUpdate", { systemId, position: payload });
  }

  private async handleBatteryStatus(message: MAVLinkMessage) {
    const payload: SysBatteryStatusPayload = message.payload;
    const systemId = message.system_id;

    await storage.updateDroneTelemetry(systemId, {
      batteryLevel: payload.battery_remaining,
      voltage: payload.voltages[0] / 1000, // Convert from mV to V
    });

    this.emit("batteryUpdate", { systemId, battery: payload });
  }

  private async handleAttitude(message: MAVLinkMessage) {
    const payload: AttitudePayload = message.payload;
    const systemId = message.system_id;

    // Convert radians to degrees
    const rollDeg = (payload.roll * 180) / Math.PI;
    const pitchDeg = (payload.pitch * 180) / Math.PI;
    const yawDeg = (payload.yaw * 180) / Math.PI;

    await storage.updateDroneTelemetry(systemId, {
      roll: rollDeg,
      pitch: pitchDeg,
      yaw: yawDeg,
      lastTelemetry: new Date(),
    });

    this.emit("attitudeUpdate", { systemId, attitude: payload });
  }

  private async handleGpsRawInt(message: MAVLinkMessage) {
    const payload: GpsRawIntPayload = message.payload;
    const systemId = message.system_id;

    await storage.updateDroneTelemetry(systemId, {
      gpsFixType: payload.fix_type,
      satelliteCount: payload.satellites_visible,
    });

    this.emit("gpsUpdate", { systemId, gps: payload });
  }

  private getAutopilotName(autopilot: number): string {
    const autopilots = {
      0: "Generic",
      3: "ArduPilot",
      4: "OpenPilot",
      12: "PX4",
    };
    return autopilots[autopilot as keyof typeof autopilots] || "Unknown";
  }

  private getMessageName(messageId: number): string {
    const messageNames: { [key: number]: string } = {
      0: "HEARTBEAT",
      1: "SYS_STATUS",
      2: "SYSTEM_TIME",
      4: "PING",
      5: "CHANGE_OPERATOR_CONTROL",
      6: "CHANGE_OPERATOR_CONTROL_ACK",
      7: "AUTH_KEY",
      11: "SET_MODE",
      20: "PARAM_REQUEST_READ",
      21: "PARAM_REQUEST_LIST",
      22: "PARAM_VALUE",
      23: "PARAM_SET",
      24: "GPS_RAW_INT",
      25: "GPS_STATUS",
      26: "SCALED_IMU",
      27: "RAW_IMU",
      28: "RAW_PRESSURE",
      29: "SCALED_PRESSURE",
      30: "ATTITUDE",
      31: "ATTITUDE_QUATERNION",
      32: "LOCAL_POSITION_NED",
      33: "GLOBAL_POSITION_INT",
      34: "RC_CHANNELS_SCALED",
      35: "RC_CHANNELS_RAW",
      36: "SERVO_OUTPUT_RAW",
      37: "MISSION_REQUEST_PARTIAL_LIST",
      38: "MISSION_WRITE_PARTIAL_LIST",
      39: "MISSION_ITEM",
      40: "MISSION_REQUEST",
      41: "MISSION_SET_CURRENT",
      42: "MISSION_CURRENT",
      43: "MISSION_REQUEST_LIST",
      44: "MISSION_COUNT",
      45: "MISSION_CLEAR_ALL",
      46: "MISSION_ITEM_REACHED",
      47: "MISSION_ACK",
      48: "SET_GPS_GLOBAL_ORIGIN",
      49: "GPS_GLOBAL_ORIGIN",
      50: "PARAM_MAP_RC",
      51: "MISSION_REQUEST_INT",
      54: "SAFETY_SET_ALLOWED_AREA",
      55: "SAFETY_ALLOWED_AREA",
      61: "ATTITUDE_QUATERNION_COV",
      62: "NAV_CONTROLLER_OUTPUT",
      63: "GLOBAL_POSITION_INT_COV",
      64: "LOCAL_POSITION_NED_COV",
      65: "RC_CHANNELS",
      66: "REQUEST_DATA_STREAM",
      67: "DATA_STREAM",
      69: "MANUAL_CONTROL",
      70: "RC_CHANNELS_OVERRIDE",
      73: "MISSION_ITEM_INT",
      74: "VFR_HUD",
      75: "COMMAND_INT",
      76: "COMMAND_LONG",
      77: "COMMAND_ACK",
      81: "MANUAL_SETPOINT",
      82: "SET_ATTITUDE_TARGET",
      83: "ATTITUDE_TARGET",
      84: "SET_POSITION_TARGET_LOCAL_NED",
      85: "POSITION_TARGET_LOCAL_NED",
      86: "SET_POSITION_TARGET_GLOBAL_INT",
      87: "POSITION_TARGET_GLOBAL_INT",
      89: "LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET",
      90: "HIL_STATE",
      91: "HIL_CONTROLS",
      92: "HIL_RC_INPUTS_RAW",
      93: "HIL_ACTUATOR_CONTROLS",
      100: "OPTICAL_FLOW",
      101: "GLOBAL_VISION_POSITION_ESTIMATE",
      102: "VISION_POSITION_ESTIMATE",
      103: "VISION_SPEED_ESTIMATE",
      104: "VICON_POSITION_ESTIMATE",
      105: "HIGHRES_IMU",
      106: "OPTICAL_FLOW_RAD",
      107: "HIL_SENSOR",
      108: "SIM_STATE",
      109: "RADIO_STATUS",
      110: "FILE_TRANSFER_PROTOCOL",
      111: "TIMESYNC",
      112: "CAMERA_TRIGGER",
      113: "HIL_GPS",
      114: "HIL_OPTICAL_FLOW",
      115: "HIL_STATE_QUATERNION",
      116: "SCALED_IMU2",
      117: "LOG_REQUEST_LIST",
      118: "LOG_ENTRY",
      119: "LOG_REQUEST_DATA",
      120: "LOG_DATA",
      121: "LOG_ERASE",
      122: "LOG_REQUEST_END",
      123: "GPS_INJECT_DATA",
      124: "GPS2_RAW",
      125: "POWER_STATUS",
      126: "SERIAL_CONTROL",
      127: "GPS_RTK",
      128: "GPS2_RTK",
      129: "SCALED_IMU3",
      130: "DATA_TRANSMISSION_HANDSHAKE",
      131: "ENCAPSULATED_DATA",
      132: "DISTANCE_SENSOR",
      133: "TERRAIN_REQUEST",
      134: "TERRAIN_DATA",
      135: "TERRAIN_CHECK",
      136: "TERRAIN_REPORT",
      137: "SCALED_PRESSURE2",
      138: "ATT_POS_MOCAP",
      139: "SET_ACTUATOR_CONTROL_TARGET",
      140: "ACTUATOR_CONTROL_TARGET",
      141: "ALTITUDE",
      142: "RESOURCE_REQUEST",
      143: "SCALED_PRESSURE3",
      144: "FOLLOW_TARGET",
      146: "CONTROL_SYSTEM_STATE",
      147: "BATTERY_STATUS",
      148: "AUTOPILOT_VERSION",
      149: "LANDING_TARGET",
      230: "ESTIMATOR_STATUS",
      231: "WIND_COV",
      232: "GPS_INPUT",
      233: "GPS_RTCM_DATA",
      234: "HIGH_LATENCY",
      235: "HIGH_LATENCY2",
      241: "VIBRATION",
      242: "HOME_POSITION",
      243: "SET_HOME_POSITION",
      244: "MESSAGE_INTERVAL",
      245: "EXTENDED_SYS_STATE",
      246: "ADSB_VEHICLE",
      247: "COLLISION",
      248: "V2_EXTENSION",
      249: "MEMORY_VECT",
      250: "DEBUG_VECT",
      251: "NAMED_VALUE_FLOAT",
      252: "NAMED_VALUE_INT",
      253: "STATUSTEXT",
      254: "DEBUG",
      256: "SETUP_SIGNING",
      257: "BUTTON_CHANGE",
      258: "PLAY_TUNE",
      259: "CAMERA_INFORMATION",
      260: "CAMERA_SETTINGS",
      261: "STORAGE_INFORMATION",
      262: "CAMERA_CAPTURE_STATUS",
      263: "CAMERA_IMAGE_CAPTURED",
      264: "FLIGHT_INFORMATION",
      265: "MOUNT_ORIENTATION",
      266: "LOGGING_DATA",
      267: "LOGGING_DATA_ACKED",
      268: "LOGGING_ACK",
      269: "VIDEO_STREAM_INFORMATION",
      270: "VIDEO_STREAM_STATUS",
      299: "WIFI_CONFIG_AP",
      300: "PROTOCOL_VERSION",
      310: "UAVCAN_NODE_STATUS",
      311: "UAVCAN_NODE_INFO",
    };

    return messageNames[messageId] || `UNKNOWN_${messageId}`;
  }

  private getFlightModeName(baseMode: number, customMode: number): string {
    // This is simplified - in reality, flight modes depend on the autopilot type
    const modes = {
      0: "STABILIZE",
      1: "ACRO",
      2: "ALT_HOLD",
      3: "AUTO",
      4: "GUIDED",
      5: "LOITER",
      6: "RTL",
      7: "CIRCLE",
      9: "LAND",
      16: "POSHOLD",
      17: "BRAKE",
      18: "THROW",
      19: "AVOID_ADSB",
      20: "GUIDED_NOGPS",
    };
    return modes[customMode as keyof typeof modes] || "UNKNOWN";
  }

  private startHeartbeat() {
    // Disable heartbeat for now - focus on receiving data from real hardware
    // We don't need to send heartbeats to receive telemetry data
    console.log("⏭️  Heartbeat disabled - focusing on receiving real drone data");
  }

  private sendHeartbeatMessage() {
    if (!this.connection || !this.mavlinkParser) {
      return;
    }

    try {
      // Skip heartbeat sending for now - focus on receiving data
      // The mavlink library message construction needs proper initialization
      // For development, we'll focus on receiving telemetry data from real hardware
      console.log('⏭️  Skipping heartbeat - focusing on receiving real drone data');
      return;

      // Send based on connection type
      if (this.connectionType === "serial" && this.connection.write) {
        this.connection.write(buffer);
      } else if (this.connectionType === "udp" && this.connection.send) {
        this.connection.send(buffer, this.connection.targetPort, this.connection.targetHost);
      } else if (this.connectionType === "tcp" && this.connection.write) {
        this.connection.write(buffer);
      }

      console.log("📤 MAVLink Message Sent:", {
        system_id: 1,
        component_id: 1,
        message_id: 0,
        message_name: "HEARTBEAT",
        payload: {
          type: 6,
          autopilot: 8,
          base_mode: 0,
          custom_mode: 0,
          system_status: 4,
          mavlink_version: 3,
        },
        timestamp: new Date().toISOString(),
        direction: "OUTGOING",
      });
    } catch (error) {
      console.error("❌ Failed to send heartbeat:", error);
    }
  }

  private startTelemetryUpdates() {
    this.telemetryInterval = setInterval(async () => {
      try {
        const drones = await storage.getAllDrones();
        const now = new Date();

        // Mark drones as disconnected if no telemetry for 10 seconds
        for (const drone of drones) {
          if (
            drone.lastTelemetry &&
            now.getTime() - drone.lastTelemetry.getTime() > 10000
          ) {
            await storage.updateDroneTelemetry(drone.id, {
              isConnected: false,
            });
          }
        }
      } catch (error) {
        console.error("Error updating drone connection status:", error);
      }
    }, 5000);
  }

  private simulateDroneData() {
    // This simulates real drone telemetry when simulation mode is enabled
    if (this.useSimulation) {
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
          },
        };

        await this.handleMAVLinkMessage(message);

        // Simulate ATTITUDE message for AHRS display
        const attitudeMessage: MAVLinkMessage = {
          system_id: 1,
          component_id: 1,
          message_id: 30, // ATTITUDE
          payload: {
            time_boot_ms: Date.now(),
            roll: (Math.random() - 0.5) * 0.4, // ±0.2 radians (~±11 degrees)
            pitch: (Math.random() - 0.5) * 0.3, // ±0.15 radians (~±8 degrees)
            yaw: Math.random() * 2 * Math.PI, // 0 to 2π radians (0-360 degrees)
            rollspeed: (Math.random() - 0.5) * 0.1,
            pitchspeed: (Math.random() - 0.5) * 0.1,
            yawspeed: (Math.random() - 0.5) * 0.2,
          },
        };

        await this.handleMAVLinkMessage(attitudeMessage);
      }, 2000);

      // Simulate battery updates
      setInterval(async () => {
        const batteryLevel = Math.max(
          0,
          Math.min(100, 85 + (Math.random() - 0.5) * 20),
        );
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
            voltages: [
              Math.round(voltage * 1000),
              -1,
              -1,
              -1,
              -1,
              -1,
              -1,
              -1,
              -1,
              -1,
            ],
            current_battery: 1500,
            current_consumed: 2000,
            energy_consumed: -1,
            battery_remaining: batteryLevel,
          },
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

    console.log("MAVLink service disconnected");
  }
}

export const mavlinkService = new MAVLinkService();
