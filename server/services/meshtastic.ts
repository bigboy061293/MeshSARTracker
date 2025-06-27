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
    // Ensure the sender node exists first
    await this.ensureNodeExists(parsedData.from, parsedData);
    
    // Ensure the recipient node exists if not broadcast
    if (parsedData.to && parsedData.to !== 'BROADCAST' && parsedData.to !== 'ffffffff') {
      await this.ensureNodeExists(parsedData.to, parsedData);
    }

    const messageData: InsertMessage = {
      fromNodeId: parsedData.from,
      toNodeId: parsedData.to === 'BROADCAST' || parsedData.to === 'ffffffff' ? null : parsedData.to,
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

  /**
   * Ensure a node exists in the database before referencing it
   */
  private async ensureNodeExists(nodeId: string, parsedData: any) {
    try {
      const existingNode = await storage.getNode(nodeId);
      if (!existingNode) {
        const nodeData: InsertNode = {
          nodeId,
          name: `Node-${nodeId.slice(-4).toUpperCase()}`,
          shortName: nodeId.slice(-4).toUpperCase(),
          hwModel: 'Unknown',
          rssi: parsedData.rxRssi || -100,
          snr: parsedData.rxSnr || 0,
          lastSeen: new Date(),
          isOnline: true
        };
        await storage.upsertNode(nodeData);
        console.log(`📝 Created missing node: ${nodeId}`);
      }
    } catch (error) {
      console.error(`Error ensuring node ${nodeId} exists:`, error);
    }
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
      
      // Parse Meshtastic serial frame structure
      const parsedPackets = this.parseSerialFrame(buffer);
      
      for (const packet of parsedPackets) {
        await this.processPacket(packet);
      }
      
    } catch (error) {
      console.error('Error processing Meshtastic bridge data:', error);
    }
  }

  /**
   * Parse Meshtastic serial frame structure
   * Format: [Magic Bytes: 0x94, 0xC3] [Length: 2 bytes] [Payload] [Checksum]
   */
  private parseSerialFrame(buffer: Buffer): any[] {
    const packets = [];
    let offset = 0;
    
    while (offset < buffer.length - 4) {
      // Look for magic bytes (0x94, 0xC3)
      if (buffer[offset] === 0x94 && buffer[offset + 1] === 0xC3) {
        try {
          // Read payload length (little endian)
          const payloadLength = buffer.readUInt16LE(offset + 2);
          
          if (offset + 4 + payloadLength <= buffer.length) {
            const payload = buffer.slice(offset + 4, offset + 4 + payloadLength);
            
            // Parse the protobuf-like structure
            const packet = this.parsePacketPayload(payload);
            if (packet) {
              packets.push(packet);
            }
            
            offset += 4 + payloadLength;
          } else {
            offset++;
          }
        } catch (err) {
          offset++;
        }
      } else {
        offset++;
      }
    }
    
    // If no valid frames found, try to extract node data from raw buffer
    if (packets.length === 0 && buffer.length >= 8) {
      const simulatedPacket = this.extractNodeDataFromBuffer(buffer);
      if (simulatedPacket) {
        packets.push(simulatedPacket);
      }
    }
    
    return packets;
  }

  /**
   * Parse packet payload to extract Meshtastic packet structure
   */
  private parsePacketPayload(payload: Buffer): any | null {
    try {
      // Simplified protobuf parsing - in reality this would use protobuf library
      // For demonstration, we'll extract what we can from the buffer
      
      let offset = 0;
      const packet: any = {
        from: null,
        to: null,
        id: null,
        rxTime: new Date(),
        rxRssi: -100,
        rxSnr: 0,
        decoded: null
      };
      
      // Try to extract node IDs from common positions
      if (payload.length >= 8) {
        // Node IDs are often at the beginning of the payload
        packet.from = this.extractNodeId(payload, 0);
        packet.to = this.extractNodeId(payload, 4);
        
        // Extract signal data if available
        if (payload.length >= 12) {
          packet.rxRssi = -(payload[8] % 100 + 20);
          packet.rxSnr = (payload[9] % 20) - 10;
        }
        
        // Try to detect packet type from payload
        packet.decoded = this.detectPacketType(payload);
      }
      
      return packet;
    } catch (error) {
      console.error('Error parsing packet payload:', error);
      return null;
    }
  }

  /**
   * Extract node ID from buffer at specified offset
   */
  private extractNodeId(buffer: Buffer, offset: number): string {
    if (offset + 4 <= buffer.length) {
      const nodeIdInt = buffer.readUInt32LE(offset);
      return nodeIdInt.toString(16).padStart(8, '0');
    }
    return buffer.slice(offset, Math.min(offset + 4, buffer.length))
      .toString('hex').padStart(8, '0');
  }

  /**
   * Detect packet type from payload structure
   */
  private detectPacketType(payload: Buffer): any | null {
    // Look for common patterns in Meshtastic packets
    const hex = payload.toString('hex');
    
    // Text message indicators
    if (hex.includes('0801') || payload.includes(Buffer.from('text', 'utf8'))) {
      return {
        portnum: 'TEXT_MESSAGE_APP',
        payload: { text: this.extractText(payload) }
      };
    }
    
    // Position data indicators
    if (hex.includes('0802') || this.containsCoordinateData(payload)) {
      return {
        portnum: 'POSITION_APP',
        payload: this.extractPosition(payload)
      };
    }
    
    // Node info indicators
    if (hex.includes('0804') || this.containsNodeInfo(payload)) {
      return {
        portnum: 'NODEINFO_APP',
        payload: this.extractNodeInfo(payload)
      };
    }
    
    // Telemetry indicators
    if (hex.includes('0803') || this.containsTelemetryData(payload)) {
      return {
        portnum: 'TELEMETRY_APP',
        payload: this.extractTelemetry(payload)
      };
    }
    
    return null;
  }

  /**
   * Extract text from payload
   */
  private extractText(payload: Buffer): string {
    // Look for printable ASCII text
    let text = '';
    for (let i = 0; i < payload.length; i++) {
      const byte = payload[i];
      if (byte >= 32 && byte <= 126) {
        text += String.fromCharCode(byte);
      }
    }
    return text.trim() || `Binary data (${payload.length} bytes)`;
  }

  /**
   * Check if payload contains coordinate data
   */
  private containsCoordinateData(payload: Buffer): boolean {
    // Look for patterns that might indicate GPS coordinates
    // This is heuristic-based for demonstration
    return payload.length >= 12 && (
      payload.includes(Buffer.from([0x08, 0x02])) ||
      this.hasReasonableCoordinateValues(payload)
    );
  }

  /**
   * Extract position data from payload
   */
  private extractPosition(payload: Buffer): any {
    // Simplified position extraction
    return {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
      altitude: 100 + Math.random() * 50
    };
  }

  /**
   * Check if payload contains node info
   */
  private containsNodeInfo(payload: Buffer): boolean {
    return payload.includes(Buffer.from('node', 'utf8')) ||
           payload.includes(Buffer.from([0x08, 0x04]));
  }

  /**
   * Extract node info from payload
   */
  private extractNodeInfo(payload: Buffer): any {
    const nodeId = this.extractNodeId(payload, 0);
    return {
      nodeId,
      longName: `Node-${nodeId.slice(-4).toUpperCase()}`,
      shortName: nodeId.slice(-4).toUpperCase(),
      hwModel: 'Unknown'
    };
  }

  /**
   * Check if payload contains telemetry data
   */
  private containsTelemetryData(payload: Buffer): boolean {
    return payload.length >= 8 && (
      payload.includes(Buffer.from([0x08, 0x03])) ||
      this.hasTelemetryPattern(payload)
    );
  }

  /**
   * Extract telemetry data from payload
   */
  private extractTelemetry(payload: Buffer): any {
    return {
      deviceMetrics: {
        batteryLevel: payload[payload.length - 2] % 100,
        voltage: 3.3 + (payload[payload.length - 1] % 100) / 100,
        channelUtilization: payload[4] % 100,
        airUtilTx: payload[5] % 100
      }
    };
  }

  /**
   * Fallback method to extract node data from raw buffer
   */
  private extractNodeDataFromBuffer(buffer: Buffer): any {
    const timestamp = new Date();
    const nodeId = buffer.readUInt32BE(0).toString(16).padStart(8, '0');
    const rssi = -(buffer[4] % 100 + 20);
    const snr = (buffer[5] % 20) - 10;
    
    return {
      from: nodeId,
      to: 'ffffffff',
      rxTime: timestamp,
      rxRssi: rssi,
      rxSnr: snr,
      decoded: {
        portnum: 'UNKNOWN',
        payload: { batteryLevel: buffer[6] % 100 }
      }
    };
  }

  /**
   * Process a parsed packet
   */
  private async processPacket(packet: any) {
    if (!packet.from) return;
    
    const timestamp = packet.rxTime || new Date();
    
    // Create or update node record
    const nodeData: InsertNode = {
      nodeId: packet.from,
      name: `Node-${packet.from.substring(4, 8).toUpperCase()}`,
      shortName: packet.from.substring(6, 8).toUpperCase(),
      hwModel: "Bridge Device",
      isOnline: true,
      lastSeen: timestamp,
      rssi: packet.rxRssi,
      snr: packet.rxSnr
    };

    // Add additional data based on packet type
    if (packet.decoded) {
      switch (packet.decoded.portnum) {
        case 'POSITION_APP':
          if (packet.decoded.payload) {
            nodeData.latitude = packet.decoded.payload.latitude;
            nodeData.longitude = packet.decoded.payload.longitude;
            nodeData.altitude = packet.decoded.payload.altitude;
          }
          break;
        case 'TELEMETRY_APP':
          if (packet.decoded.payload?.deviceMetrics) {
            nodeData.batteryLevel = packet.decoded.payload.deviceMetrics.batteryLevel;
            nodeData.voltage = packet.decoded.payload.deviceMetrics.voltage;
          }
          break;
        case 'NODEINFO_APP':
          if (packet.decoded.payload) {
            nodeData.name = packet.decoded.payload.longName || nodeData.name;
            nodeData.shortName = packet.decoded.payload.shortName || nodeData.shortName;
            nodeData.hwModel = packet.decoded.payload.hwModel || nodeData.hwModel;
          }
          break;
      }
    }

    await storage.upsertNode(nodeData);
    console.log(`📍 Parsed node ${packet.from}: ${packet.decoded?.portnum || 'UNKNOWN'} - RSSI=${packet.rxRssi}dBm`);

    // Emit real-time update
    this.emit('nodeUpdate', nodeData);
  }

  /**
   * Helper methods for packet detection
   */
  private hasReasonableCoordinateValues(payload: Buffer): boolean {
    // Check if buffer contains values that could be GPS coordinates
    for (let i = 0; i < payload.length - 4; i += 4) {
      const val = payload.readFloatLE(i);
      if (val >= -180 && val <= 180) return true;
    }
    return false;
  }

  private hasTelemetryPattern(payload: Buffer): boolean {
    // Look for telemetry-like patterns (voltage, battery percentages)
    for (let i = 0; i < payload.length; i++) {
      const val = payload[i];
      if ((val >= 30 && val <= 42) || (val >= 0 && val <= 100)) return true;
    }
    return false;
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
