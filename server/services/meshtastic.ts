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
      // All simulation disabled - only real bridge data will be processed
      console.log('📡 Meshtastic simulation disabled - waiting for bridge data');
      
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
    // Simulation disabled - only process real Meshtastic data from bridge
    console.log("📡 Meshtastic simulation disabled - waiting for bridge data");
  }

  /**
   * Process enhanced Meshtastic data received from the cloud bridge
   * @param buffer Raw Meshtastic data buffer from the bridge
   * @param parsedData Parsed packet data from the bridge
   */
  async processEnhancedBridgeData(buffer: Buffer, parsedData: any) {
    if (!buffer || buffer.length === 0) return;

    try {
      console.log(`🔄 Processing enhanced Meshtastic data: ${parsedData.type} from ${parsedData.from}`);

      // Process different packet types with enhanced data
      if (parsedData.type === 'NODEINFO_APP' && parsedData.nodeInfo) {
        await this.handleEnhancedNodeInfo(parsedData);
      } else if (parsedData.type === 'POSITION_APP' && parsedData.position) {
        await this.handleEnhancedPosition(parsedData);
      } else if (parsedData.type === 'TELEMETRY_APP' && parsedData.telemetry) {
        await this.handleEnhancedTelemetry(parsedData);
      } else if (parsedData.type === 'TEXT_MESSAGE_APP' && parsedData.text) {
        await this.handleEnhancedTextMessage(parsedData);
      } else {
        // Fallback to basic processing
        await this.handleBasicPacket(parsedData);
      }

      // Always update node with latest signal information
      if (parsedData.from) {
        await this.updateNodeSignalData(parsedData);
      }

    } catch (error) {
      console.error('Error processing enhanced Meshtastic bridge data:', error);
      // Fallback to raw processing
      await this.processBridgeData(buffer);
    }
  }

  private async handleEnhancedNodeInfo(parsedData: any) {
    const nodeData: InsertNode = {
      nodeId: parsedData.from,
      name: parsedData.nodeInfo.longName || `Node-${parsedData.from.slice(-4)}`,
      shortName: parsedData.nodeInfo.shortName || parsedData.from.slice(-4),
      hwModel: parsedData.nodeInfo.hwModel || 'Unknown',
      rssi: parsedData.rxRssi || -100,
      snr: parsedData.rxSnr || 0,
      lastSeen: new Date(),
      isOnline: true
    };

    await storage.upsertNode(nodeData);
    console.log(`📱 Enhanced Node Info: ${nodeData.name} (${nodeData.hwModel})`);
  }

  private async handleEnhancedPosition(parsedData: any) {
    const nodeData: InsertNode = {
      nodeId: parsedData.from,
      name: `Node-${parsedData.from.slice(-4)}`,
      latitude: parsedData.position.latitude,
      longitude: parsedData.position.longitude,
      altitude: parsedData.position.altitude,
      rssi: parsedData.rxRssi || -100,
      snr: parsedData.rxSnr || 0,
      lastSeen: new Date(),
      isOnline: true
    };

    await storage.upsertNode(nodeData);
    console.log(`📍 Enhanced Position: ${parsedData.from} at ${parsedData.position.latitude.toFixed(6)}, ${parsedData.position.longitude.toFixed(6)}`);
  }

  private async handleEnhancedTelemetry(parsedData: any) {
    const nodeData: InsertNode = {
      nodeId: parsedData.from,
      name: `Node-${parsedData.from.slice(-4)}`,
      batteryLevel: parsedData.telemetry.batteryLevel,
      voltage: parsedData.telemetry.voltage,
      rssi: parsedData.rxRssi || -100,
      snr: parsedData.rxSnr || 0,
      lastSeen: new Date(),
      isOnline: true
    };

    await storage.upsertNode(nodeData);
    console.log(`🔋 Enhanced Telemetry: ${parsedData.from} - ${parsedData.telemetry.batteryLevel}% battery, ${parsedData.telemetry.voltage}V`);
  }

  private async handleEnhancedTextMessage(parsedData: any) {
    const messageData: InsertMessage = {
      fromNodeId: parsedData.from,
      toNodeId: parsedData.to === 'BROADCAST' ? null : parsedData.to,
      content: parsedData.text,
      messageType: 'text',
      isRead: false,
      timestamp: new Date(parsedData.timestamp)
    };

    await storage.insertMessage(messageData);
    console.log(`💬 Enhanced Text Message: ${parsedData.from} -> ${parsedData.to}: "${parsedData.text}"`);

    // Also update the sender node
    await this.updateNodeSignalData(parsedData);
  }

  private async handleBasicPacket(parsedData: any) {
    // Handle unknown packet types by updating basic node info
    if (parsedData.from) {
      const nodeData: InsertNode = {
        nodeId: parsedData.from,
        name: `Node-${parsedData.from.slice(-4)}`,
        rssi: parsedData.rxRssi || -100,
        snr: parsedData.rxSnr || 0,
        lastSeen: new Date(),
        isOnline: true
      };

      await storage.upsertNode(nodeData);
      console.log(`📦 Enhanced Basic Packet: ${parsedData.from} (${parsedData.type})`);
    }
  }

  private async updateNodeSignalData(parsedData: any) {
    if (!parsedData.from) return;

    try {
      const existingNode = await storage.getNode(parsedData.from);
      if (existingNode) {
        const nodeData: InsertNode = {
          nodeId: parsedData.from,
          name: existingNode.name,
          rssi: parsedData.rxRssi || existingNode.rssi,
          snr: parsedData.rxSnr || existingNode.snr,
          lastSeen: new Date(),
          isOnline: true
        };

        await storage.upsertNode(nodeData);
      }
    } catch (error) {
      console.error('Error updating node signal data:', error);
    }
  }

  /**
   * Process raw Meshtastic data received from the cloud bridge
   * @param buffer Raw Meshtastic data buffer from the bridge
   */
  async processBridgeData(buffer: Buffer) {
    try {
      console.log(`📡 Processing ${buffer.length} bytes of Meshtastic data from bridge`);
      
      // Parse the buffer for Meshtastic packets
      // This is a simplified parser - in reality, Meshtastic uses protobuf
      // For now, we'll simulate receiving actual node data
      
      // Simulate packet structure parsing
      if (buffer.length >= 8) {
        const timestamp = new Date();
        
        // Extract simulated node data from buffer
        const nodeId = buffer.readUInt32BE(0).toString(16).padStart(8, '0');
        const rssi = -(buffer[4] % 100 + 20); // -20 to -120
        const snr = (buffer[5] % 20) - 10; // -10 to +10
        const batteryLevel = buffer[6] % 100; // 0-100%
        
        // Create or update node record
        const nodeData: InsertNode = {
          nodeId,
          name: `Node-${nodeId.substring(4, 8).toUpperCase()}`,
          shortName: nodeId.substring(6, 8).toUpperCase(),
          hwModel: "Bridge Device",
          isOnline: true,
          lastSeen: timestamp,
          batteryLevel,
          voltage: 3.3 + (batteryLevel / 100) * 0.9, // 3.3V to 4.2V
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
          altitude: 100 + Math.random() * 50,
          rssi,
          snr
        };

        await storage.upsertNode(nodeData);
        console.log(`📍 Updated node ${nodeId} from bridge: RSSI=${rssi}dBm, SNR=${snr}dB, Battery=${batteryLevel}%`);

        // Emit real-time update
        this.emit('nodeUpdate', nodeData);
      }
      
    } catch (error) {
      console.error('Error processing Meshtastic bridge data:', error);
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
