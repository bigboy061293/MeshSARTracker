export interface NodeData {
  id: number;
  nodeId: string;
  name: string;
  shortName?: string;
  hwModel?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  rssi?: number;
  snr?: number;
  batteryLevel?: number;
  voltage?: number;
  lastSeen?: Date;
  isOnline: boolean;
}

export interface MessageData {
  id: number;
  fromNodeId?: string;
  toNodeId?: string;
  content: string;
  messageType: 'text' | 'position' | 'telemetry' | 'admin';
  timestamp: Date;
  acknowledged: boolean;
}

export interface DroneData {
  id: number;
  name: string;
  serialNumber?: string;
  model?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  altitudeRelative?: number;
  groundSpeed?: number;
  airSpeed?: number;
  heading?: number;
  batteryLevel?: number;
  voltage?: number;
  flightMode?: string;
  armed: boolean;
  gpsFixType?: number;
  satelliteCount?: number;
  lastTelemetry?: Date;
  isConnected: boolean;
}

export interface MissionData {
  id: number;
  name: string;
  description?: string;
  createdBy?: string;
  droneId?: number;
  status: 'planned' | 'active' | 'completed' | 'aborted';
  waypoints?: any;
  parameters?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatus {
  activeNodes: number;
  totalNodes: number;
  connectedDrones: number;
  totalDrones: number;
  meshtasticConnected: boolean;
  mavlinkConnected: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  success?: boolean;
}

export interface UserRole {
  role: 'admin' | 'user' | 'watcher';
}

export interface MapMarker {
  id: string;
  type: 'node' | 'drone' | 'waypoint';
  position: [number, number];
  data: any;
}
