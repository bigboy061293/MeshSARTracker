import { EventEmitter } from 'events';
import { storage } from '../storage';
import type { InsertNode, InsertMessage } from '@shared/schema';

interface MeshtasticPacket {
  from: string;
  to: string;
  id: number;
  rxTime: Date;
  rxSnr: number;
  rxRssi: number;
  hopLimit: number;
  channel: number;
  decoded?: {
    portnum: string;
    payload: any;
  };
}

interface NodeInfo {
  nodeId: string;
  longName: string;
  shortName: string;
  hwModel: string;
  position?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  deviceMetrics?: {
    batteryLevel: number;
    voltage: number;
    channelUtilization: number;
    airUtilTx: number;
  };
}

class MeshtasticService extends EventEmitter {
  private connected = false;
  private serialPort: any = null;
  private nodeStatusInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  async initialize() {
    try {
      // In a real implementation, this would connect to the Meshtastic device
      // For now, we'll simulate the connection and start periodic data updates
      console.log('Initializing Meshtastic service...');
      
      this.connected = true;
      this.startNodeStatusUpdates();
      this.simulateIncomingData(); // For development/demo
      
      console.log('Meshtastic service initialized');
    } catch (error) {
      console.error('Failed to initialize Meshtastic service:', error);
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendMessage(toNodeId: string, content: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Meshtastic not connected');
    }

    try {
      // In a real implementation, this would send the message via the Meshtastic device
      console.log(`Sending message to ${toNodeId}: ${content}`);
      
      // Store the message in database
      await storage.insertMessage({
        fromNodeId: 'BASE_STATION',
        toNodeId,
        content,
        messageType: 'text',
      });

      this.emit('messageSent', { toNodeId, content });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  private async handleIncomingPacket(packet: MeshtasticPacket) {
    try {
      // Update node status
      await this.updateNodeFromPacket(packet);

      // Handle different packet types
      if (packet.decoded) {
        switch (packet.decoded.portnum) {
          case 'TEXT_MESSAGE_APP':
            await this.handleTextMessage(packet);
            break;
          case 'POSITION_APP':
            await this.handlePositionUpdate(packet);
            break;
          case 'NODEINFO_APP':
            await this.handleNodeInfo(packet);
            break;
          case 'TELEMETRY_APP':
            await this.handleTelemetry(packet);
            break;
        }
      }

      this.emit('packetReceived', packet);
    } catch (error) {
      console.error('Error handling incoming packet:', error);
    }
  }

  private async updateNodeFromPacket(packet: MeshtasticPacket) {
    const nodeData: InsertNode = {
      nodeId: packet.from,
      name: `Node-${packet.from.slice(-4)}`,
      rssi: packet.rxRssi,
      snr: packet.rxSnr,
      lastSeen: packet.rxTime,
    };

    await storage.upsertNode(nodeData);
    await storage.updateNodeStatus(packet.from, true, packet.rxTime);
  }

  private async handleTextMessage(packet: MeshtasticPacket) {
    const messageData: InsertMessage = {
      fromNodeId: packet.from,
      toNodeId: packet.to,
      content: packet.decoded?.payload?.text || '',
      messageType: 'text',
    };

    const message = await storage.insertMessage(messageData);
    this.emit('messageReceived', message);
  }

  private async handlePositionUpdate(packet: MeshtasticPacket) {
    const position = packet.decoded?.payload;
    if (position) {
      const nodeData: InsertNode = {
        nodeId: packet.from,
        name: `Node-${packet.from.slice(-4)}`,
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
        lastSeen: packet.rxTime,
      };

      await storage.upsertNode(nodeData);
      this.emit('positionUpdate', { nodeId: packet.from, position });
    }
  }

  private async handleNodeInfo(packet: MeshtasticPacket) {
    const nodeInfo: NodeInfo = packet.decoded?.payload;
    if (nodeInfo) {
      const nodeData: InsertNode = {
        nodeId: nodeInfo.nodeId,
        name: nodeInfo.longName,
        shortName: nodeInfo.shortName,
        hwModel: nodeInfo.hwModel,
        latitude: nodeInfo.position?.latitude,
        longitude: nodeInfo.position?.longitude,
        altitude: nodeInfo.position?.altitude,
        lastSeen: packet.rxTime,
      };

      await storage.upsertNode(nodeData);
      this.emit('nodeInfoUpdate', nodeInfo);
    }
  }

  private async handleTelemetry(packet: MeshtasticPacket) {
    const telemetry = packet.decoded?.payload;
    if (telemetry?.deviceMetrics) {
      const nodeData: InsertNode = {
        nodeId: packet.from,
        name: `Node-${packet.from.slice(-4)}`,
        batteryLevel: telemetry.deviceMetrics.batteryLevel,
        voltage: telemetry.deviceMetrics.voltage,
        lastSeen: packet.rxTime,
      };

      await storage.upsertNode(nodeData);
      this.emit('telemetryUpdate', { nodeId: packet.from, telemetry: telemetry.deviceMetrics });
    }
  }

  private startNodeStatusUpdates() {
    this.nodeStatusInterval = setInterval(async () => {
      try {
        const nodes = await storage.getAllNodes();
        const now = new Date();
        
        // Mark nodes as offline if not seen for 5 minutes
        for (const node of nodes) {
          if (node.lastSeen && (now.getTime() - node.lastSeen.getTime()) > 5 * 60 * 1000) {
            await storage.updateNodeStatus(node.nodeId, false, node.lastSeen);
          }
        }
      } catch (error) {
        console.error('Error updating node status:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private simulateIncomingData() {
    // This simulates real Meshtastic data for development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const nodeIds = ['!33a8b7f0', '!44b9c8e1', '!55cad9f2'];
        const randomNode = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        
        const packet: MeshtasticPacket = {
          from: randomNode,
          to: 'BROADCAST',
          id: Math.floor(Math.random() * 1000000),
          rxTime: new Date(),
          rxSnr: Math.random() * 10 - 5,
          rxRssi: Math.floor(Math.random() * 40) - 100,
          hopLimit: 3,
          channel: 0,
          decoded: {
            portnum: 'TELEMETRY_APP',
            payload: {
              deviceMetrics: {
                batteryLevel: Math.floor(Math.random() * 100),
                voltage: 3.0 + Math.random() * 1.2,
                channelUtilization: Math.random() * 25,
                airUtilTx: Math.random() * 10,
              }
            }
          }
        };

        this.handleIncomingPacket(packet);
      }, 5000 + Math.random() * 10000); // Random interval between 5-15 seconds
    }
  }

  async disconnect() {
    this.connected = false;
    
    if (this.nodeStatusInterval) {
      clearInterval(this.nodeStatusInterval);
      this.nodeStatusInterval = null;
    }

    if (this.serialPort) {
      // In a real implementation, close the serial port connection
      this.serialPort = null;
    }

    console.log('Meshtastic service disconnected');
  }
}

export const meshtasticService = new MeshtasticService();
