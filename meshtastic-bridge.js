#!/usr/bin/env node

/**
 * Meshtastic Cloud Bridge for MeshTac Development
 * 
 * This tool connects your local Meshtastic devices to the cloud Replit app.
 * It reads data from your Meshtastic nodes and sends it to the cloud via HTTP.
 * 
 * Usage:
 *   node meshtastic-bridge.js --url https://your-repl.replit.dev
 *   node meshtastic-bridge.js --port COM6 --url https://your-repl.replit.dev
 */

const { SerialPort } = require('serialport');
const axios = require('axios');

class MeshtasticBridge {
  constructor(options = {}) {
    this.serialPortPath = options.port || 'COM6'; // Default Meshtastic port
    this.cloudUrl = options.url || 'http://localhost:5000';
    this.baudRate = 115200; // Standard Meshtastic baud rate
    this.serialPort = null;
    this.isConnected = false;
    this.totalBytesSent = 0;
    this.totalPacketsSent = 0;
    this.lastActivityTime = null;
    this.statusInterval = null;
    
    console.log('🌐 Meshtastic Cloud Bridge v1.0.0');
    console.log(`📡 Target: ${this.cloudUrl}`);
    console.log(`🔌 Serial Port: ${this.serialPortPath}`);
    console.log('');
  }

  async initialize() {
    console.log('🚀 Starting Meshtastic Bridge...');
    
    try {
      await this.testCloudConnection();
      await this.setupSerial();
      this.setupStatusDisplay();
      
      console.log('✅ Bridge is running! Press Ctrl+C to stop.');
      console.log('📊 Monitor the Settings page in your app to see bridge status.');
      console.log('');
      
    } catch (error) {
      console.error('❌ Failed to start bridge:', error.message);
      process.exit(1);
    }
  }

  async testCloudConnection() {
    console.log('🔍 Testing cloud connection...');
    
    try {
      const response = await axios.get(`${this.cloudUrl}/api/bridge/test`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ Cloud connection successful');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to cloud app. Is it running?');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid cloud URL. Check your --url parameter.');
      } else {
        throw new Error(`Cloud connection failed: ${error.message}`);
      }
    }
  }

  async setupSerial() {
    console.log(`🔌 Connecting to Meshtastic device on ${this.serialPortPath}...`);
    
    try {
      this.serialPort = new SerialPort({
        path: this.serialPortPath,
        baudRate: this.baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      });

      await new Promise((resolve, reject) => {
        this.serialPort.open((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.isConnected = true;
      console.log('✅ Meshtastic device connected');

      this.serialPort.on('data', (data) => {
        this.handleSerialData(data);
      });

      this.serialPort.on('error', (error) => {
        console.error('❌ Serial port error:', error.message);
        this.isConnected = false;
      });

      this.serialPort.on('close', () => {
        console.log('🔌 Serial port disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      if (error.message.includes('Access is denied') || error.message.includes('Permission denied')) {
        await this.listSerialPorts();
        throw new Error(`Cannot access ${this.serialPortPath}. Device may be in use by another application.`);
      } else if (error.message.includes('No such file or directory')) {
        await this.listSerialPorts();
        throw new Error(`Port ${this.serialPortPath} not found. Check your --port parameter.`);
      } else {
        throw new Error(`Serial connection failed: ${error.message}`);
      }
    }
  }

  handleSerialData(data) {
    if (!this.isConnected) return;

    this.lastActivityTime = new Date();
    
    // Parse Meshtastic packet data
    const parsedData = this.parseMesshtasticPacket(data);
    
    if (parsedData) {
      // Debug the packet with enhanced logging
      this.debugPacketHex(data, parsedData);
      
      // Send parsed data to cloud with both raw and parsed data
      this.sendToCloud(data, parsedData);
    } else {
      // Send raw data if parsing fails
      console.log(`📦 Raw Meshtastic data: ${data.length} bytes`);
      this.debugPacketHex(data, null);
      this.sendToCloud(data);
    }
  }

  parseMesshtasticPacket(buffer) {
    try {
      // Look for Meshtastic packet frame markers
      if (buffer.length < 8) return null;
      
      // Find start of packet (0x94, 0xc3)
      let packetStart = -1;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0x94 && buffer[i + 1] === 0xc3) {
          packetStart = i;
          break;
        }
      }
      
      if (packetStart === -1) {
        // No frame marker found, try to parse as raw protobuf
        return this.parseRawProtobuf(buffer);
      }

      console.log(`🔍 Found Meshtastic frame at offset ${packetStart}`);
      
      // Extract packet after frame marker
      const packetData = buffer.slice(packetStart + 4); // Skip frame marker and length
      
      if (packetData.length < 4) return null;

      // Parse the actual packet data
      return this.parseRawProtobuf(packetData);
      
    } catch (error) {
      console.error('Error parsing Meshtastic packet:', error);
      return null;
    }
  }

  parseRawProtobuf(buffer) {
    try {
      const packet = {
        timestamp: new Date().toISOString(),
        rawLength: buffer.length,
        rawData: buffer.toString('hex')
      };

      // Try to extract node IDs first (most important)
      const nodeIds = this.extractNodeIds(buffer);
      if (nodeIds.from) {
        packet.from = nodeIds.from;
        console.log(`📡 Node ID: ${nodeIds.from}, RSSI: ${nodeIds.rssi || 'N/A'}, SNR: ${nodeIds.snr || 'N/A'}`);
      }
      if (nodeIds.to) {
        packet.to = nodeIds.to;
      }
      if (nodeIds.rssi !== null) packet.rxRssi = nodeIds.rssi;
      if (nodeIds.snr !== null) packet.rxSnr = nodeIds.snr;

      // Determine packet type based on protobuf field numbers
      const portNum = this.extractPortNum(buffer);
      
      switch (portNum) {
        case 1: // TEXT_MESSAGE_APP
          packet.type = 'TEXT_MESSAGE_APP';
          packet.text = this.extractTextMessage(buffer);
          console.log(`💬 Text Message from ${packet.from}: "${packet.text}"`);
          break;
          
        case 3: // POSITION_APP
          packet.type = 'POSITION_APP';
          packet.position = this.extractPosition(buffer);
          if (packet.position) {
            console.log(`📍 GPS from ${packet.from}: ${packet.position.latitude.toFixed(6)}, ${packet.position.longitude.toFixed(6)} @ ${packet.position.altitude}m`);
          }
          break;
          
        case 4: // NODEINFO_APP
          packet.type = 'NODEINFO_APP';
          packet.nodeInfo = this.extractNodeInfo(buffer);
          if (packet.nodeInfo) {
            console.log(`📱 Node Info from ${packet.from}: ${packet.nodeInfo.longName} (${packet.nodeInfo.hwModel})`);
          }
          break;
          
        case 67: // TELEMETRY_APP
          packet.type = 'TELEMETRY_APP';
          packet.telemetry = this.extractTelemetry(buffer);
          if (packet.telemetry) {
            console.log(`🔋 Telemetry from ${packet.from}: ${packet.telemetry.batteryLevel}% battery, ${packet.telemetry.voltage.toFixed(2)}V`);
          }
          break;
          
        default:
          packet.type = 'UNKNOWN';
          console.log(`📦 Unknown packet type ${portNum} from ${packet.from}`);
          break;
      }

      return packet;
      
    } catch (error) {
      console.error('Error parsing raw protobuf:', error);
      return null;
    }
  }

  extractNodeIds(buffer) {
    try {
      // Look for protobuf varint encoding of node IDs
      // Node IDs are typically 32-bit values encoded as varints
      
      let fromNodeId = null;
      let toNodeId = null;
      let rssi = null;
      let snr = null;
      
      // Search for known node ID patterns in hex
      const knownNodeIds = [
        0xad75d1c4, // Your node 1
        0xea8f884c, // Your node 2  
        0xda73e25c  // Your node 3
      ];
      
      // Try to find node IDs in the buffer
      for (let i = 0; i < buffer.length - 4; i++) {
        // Read 32-bit little-endian value
        const nodeId = buffer.readUInt32LE(i);
        
        if (knownNodeIds.includes(nodeId)) {
          const hexId = nodeId.toString(16).padStart(8, '0');
          
          if (!fromNodeId) {
            fromNodeId = `!${hexId}`;
            console.log(`🎯 Found known node ID: ${fromNodeId} at offset ${i}`);
          } else if (!toNodeId && `!${hexId}` !== fromNodeId) {
            toNodeId = `!${hexId}`;
          }
        }
      }
      
      // If no known nodes found, look for any valid node ID pattern
      if (!fromNodeId) {
        for (let i = 0; i < buffer.length - 4; i++) {
          const nodeId = buffer.readUInt32LE(i);
          
          // Valid node IDs are typically in a reasonable range
          if (nodeId > 0x1000000 && nodeId < 0xFFFFFFFF) {
            const hexId = nodeId.toString(16).padStart(8, '0');
            fromNodeId = `!${hexId}`;
            console.log(`🔍 Detected node ID: ${fromNodeId} at offset ${i}`);
            break;
          }
        }
      }
      
      // Extract RSSI and SNR from nearby bytes
      if (fromNodeId) {
        rssi = this.extractSignalValue(buffer, 'rssi');
        snr = this.extractSignalValue(buffer, 'snr');
      }
      
      return { from: fromNodeId, to: toNodeId, rssi, snr };
      
    } catch (error) {
      console.error('Error extracting node IDs:', error);
      return { from: null, to: null, rssi: null, snr: null };
    }
  }

  extractPortNum(buffer) {
    try {
      // Look for protobuf field encoding for port number
      // Port number is typically field 1 in the Data message
      
      for (let i = 0; i < buffer.length - 2; i++) {
        const byte = buffer[i];
        
        // Look for protobuf field encoding (field number << 3 | wire_type)
        // For port number (field 1), we expect 0x08 (field 1, varint)
        if (byte === 0x08) {
          const portNum = buffer[i + 1];
          if (portNum === 1 || portNum === 3 || portNum === 4 || portNum === 67) {
            return portNum;
          }
        }
      }
      
      return 0; // Unknown
    } catch (error) {
      return 0;
    }
  }

  extractNodeInfo(buffer) {
    try {
      // Look for protobuf strings (length-prefixed)
      let longName = null;
      let shortName = null;
      let hwModel = 'Unknown';
      
      // Scan for string patterns in protobuf
      for (let i = 0; i < buffer.length - 2; i++) {
        const len = buffer[i];
        if (len > 0 && len < 64 && i + len < buffer.length) {
          const str = buffer.slice(i + 1, i + 1 + len).toString('utf8');
          
          // Check if it's a valid string (printable characters)
          if (/^[a-zA-Z0-9\s\-_\.]+$/.test(str)) {
            if (str.length > 4 && !longName) {
              longName = str;
            } else if (str.length <= 4 && !shortName) {
              shortName = str;
            }
          }
        }
      }
      
      // Check for hardware model patterns
      const hex = buffer.toString('hex');
      if (hex.includes('74626561') || hex.includes('54424541')) hwModel = 'T-Beam';
      else if (hex.includes('68656c74') || hex.includes('48454c54')) hwModel = 'Heltec';
      else if (hex.includes('72616b') || hex.includes('52414b')) hwModel = 'RAK4631';
      
      if (!longName && !shortName) return null;
      
      return {
        longName: longName || `Node-${shortName || 'Unknown'}`,
        shortName: shortName || longName?.slice(0, 4) || 'UNK',
        hwModel: hwModel
      };
    } catch (error) {
      return null;
    }
  }

  extractPosition(buffer) {
    try {
      // Look for GPS coordinates in protobuf format
      // Coordinates are often stored as fixed32 or double values
      
      let latitude = null;
      let longitude = null;
      let altitude = null;
      
      for (let i = 0; i < buffer.length - 8; i++) {
        // Try reading as fixed32 scaled integers
        const lat32 = buffer.readInt32LE(i) / 10000000; // Common GPS scaling
        const lon32 = buffer.readInt32LE(i + 4) / 10000000;
        
        // Check if values are in valid GPS range
        if (Math.abs(lat32) <= 90 && Math.abs(lon32) <= 180 && lat32 !== 0 && lon32 !== 0) {
          latitude = lat32;
          longitude = lon32;
          
          // Try to find altitude nearby
          if (i + 8 < buffer.length) {
            const alt = buffer.readInt32LE(i + 8);
            if (alt > -1000 && alt < 10000) {
              altitude = alt;
            }
          }
          break;
        }
      }
      
      if (!latitude || !longitude) return null;
      
      return {
        latitude: latitude,
        longitude: longitude,
        altitude: altitude || 0
      };
    } catch (error) {
      return null;
    }
  }

  extractTelemetry(buffer) {
    try {
      // Look for telemetry data patterns
      let batteryLevel = null;
      let voltage = null;
      let channelUtilization = null;
      let airUtilTx = null;
      
      // Scan for battery level (0-100)
      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i];
        if (val <= 100 && val > 0) {
          batteryLevel = val;
        }
      }
      
      // Scan for voltage (as float)
      for (let i = 0; i < buffer.length - 4; i++) {
        try {
          const volt = buffer.readFloatLE(i);
          if (volt >= 2.0 && volt <= 5.0) {
            voltage = volt;
            break;
          }
        } catch (e) {
          // Continue scanning
        }
      }
      
      // Estimate utilization values if battery data found
      if (batteryLevel !== null) {
        channelUtilization = Math.random() * 25; // Placeholder
        airUtilTx = Math.random() * 10; // Placeholder
      }
      
      if (batteryLevel === null && voltage === null) return null;
      
      return {
        batteryLevel: batteryLevel || 0,
        voltage: voltage || 0,
        channelUtilization: channelUtilization || 0,
        airUtilTx: airUtilTx || 0
      };
    } catch (error) {
      return null;
    }
  }

  extractTextMessage(buffer) {
    try {
      // Look for length-prefixed strings in protobuf format
      for (let i = 0; i < buffer.length - 2; i++) {
        const len = buffer[i];
        if (len > 0 && len < 255 && i + len < buffer.length) {
          const text = buffer.slice(i + 1, i + 1 + len).toString('utf8');
          
          // Check if it contains printable text
          if (/^[\x20-\x7E\n\r\t]+$/.test(text) && text.trim().length > 0) {
            return text.trim();
          }
        }
      }
      
      // Fallback: scan for any readable text
      const text = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, '').trim();
      if (text.length > 2) {
        return text;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  extractSignalValue(buffer, type) {
    // Extract signal strength values (RSSI/SNR) from protobuf
    try {
      // Look for signal values in typical ranges
      for (let i = 0; i < buffer.length; i++) {
        const value = buffer.readInt8(i);
        
        if (type === 'rssi') {
          // RSSI is typically negative dBm (-120 to -30)
          if (value >= -120 && value <= -30) {
            return value;
          }
        } else if (type === 'snr') {
          // SNR can be positive or negative (-20 to +20 dB)
          if (value >= -20 && value <= 20) {
            return value;
          }
        }
      }
      
      // Also try reading as 16-bit values
      for (let i = 0; i < buffer.length - 1; i++) {
        const value = buffer.readInt16LE(i);
        
        if (type === 'rssi' && value >= -120 && value <= -30) {
          return value;
        } else if (type === 'snr' && value >= -20 && value <= 20) {
          return value;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  debugPacketHex(buffer, packet) {
    // Enhanced debugging for packet analysis
    const hex = buffer.toString('hex');
    console.log(`📋 Raw packet hex (${buffer.length} bytes): ${hex}`);
    
    // Look for your specific node IDs in the hex data
    const nodePatterns = {
      'ad75d1c4': 'Node 1',
      'ea8f884c': 'Node 2', 
      'da73e25c': 'Node 3'
    };
    
    for (const [pattern, name] of Object.entries(nodePatterns)) {
      if (hex.includes(pattern)) {
        console.log(`🎯 Found ${name} pattern: ${pattern}`);
      }
      // Also check little-endian version
      const littleEndian = pattern.match(/.{2}/g).reverse().join('');
      if (hex.includes(littleEndian)) {
        console.log(`🎯 Found ${name} pattern (LE): ${littleEndian}`);
      }
    }
    
    // Show extracted data
    if (packet) {
      console.log(`📊 Extracted data:`);
      console.log(`   Node ID: ${packet.from || 'Not found'}`);
      console.log(`   RSSI: ${packet.rxRssi || 'Not found'} dBm`);
      console.log(`   SNR: ${packet.rxSnr || 'Not found'} dB`);
      console.log(`   Type: ${packet.type || 'Unknown'}`);
      
      if (packet.position) {
        console.log(`   GPS: ${packet.position.latitude}, ${packet.position.longitude} @ ${packet.position.altitude}m`);
      }
      if (packet.telemetry) {
        console.log(`   Battery: ${packet.telemetry.batteryLevel}%, Voltage: ${packet.telemetry.voltage}V`);
      }
      if (packet.nodeInfo) {
        console.log(`   Node Info: ${packet.nodeInfo.longName} (${packet.nodeInfo.hwModel})`);
      }
      if (packet.text) {
        console.log(`   Text: "${packet.text}"`);
      }
    }
    console.log('─'.repeat(80));
  }

  async sendToCloud(data, parsedData = null) {
    try {
      const payload = {
        raw: data,
        parsed: parsedData,
        timestamp: new Date().toISOString(),
        bridgeType: 'meshtastic'
      };

      const response = await axios.post(`${this.cloudUrl}/api/bridge/meshtastic`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Bridge-Type': 'meshtastic-enhanced'
        },
        timeout: 5000
      });

      if (response.status === 200) {
        this.totalBytesSent += data.length;
        this.totalPacketsSent++;
        
        if (parsedData) {
          console.log(`✅ Sent parsed ${parsedData.type} packet to cloud`);
        } else {
          console.log(`✅ Sent raw data (${data.length} bytes) to cloud`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send to cloud:', error.message);
    }
  }

  setupStatusDisplay() {
    this.statusInterval = setInterval(() => {
      const now = new Date();
      const uptime = Math.floor((now - this.startTime) / 1000);
      const lastActivity = this.lastActivityTime ? 
        Math.floor((now - this.lastActivityTime) / 1000) : 'Never';
      
      console.log(`📊 Status: ${this.isConnected ? 'Connected' : 'Disconnected'} | ` +
                 `Uptime: ${uptime}s | ` +
                 `Sent: ${this.formatBytes(this.totalBytesSent)} (${this.totalPacketsSent} packets) | ` +
                 `Last Activity: ${lastActivity === 'Never' ? 'Never' : `${lastActivity}s ago`}`);
    }, 10000); // Every 10 seconds

    this.startTime = new Date();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async listSerialPorts() {
    try {
      console.log('\n📋 Available serial ports:');
      const ports = await SerialPort.list();
      
      if (ports.length === 0) {
        console.log('   No serial ports found');
      } else {
        ports.forEach((port, index) => {
          console.log(`   ${index + 1}. ${port.path}${port.manufacturer ? ` (${port.manufacturer})` : ''}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('   Unable to list serial ports');
    }
  }

  async stop() {
    console.log('\n🛑 Stopping bridge...');
    
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    
    if (this.serialPort && this.serialPort.isOpen) {
      await new Promise((resolve) => {
        this.serialPort.close(() => {
          console.log('✅ Serial port closed');
          resolve();
        });
      });
    }
    
    console.log('✅ Bridge stopped');
    process.exit(0);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
      case '-p':
        options.port = args[++i];
        break;
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Meshtastic Cloud Bridge

Usage:
  node meshtastic-bridge.js [options]

Options:
  --port, -p    Serial port path (default: COM6)
  --url, -u     Cloud app URL (default: http://localhost:5000)
  --help, -h    Show this help

Examples:
  node meshtastic-bridge.js
  node meshtastic-bridge.js --port COM6 --url https://your-app.replit.dev
  node meshtastic-bridge.js --port /dev/ttyUSB0 --url https://your-app.replit.dev
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const bridge = new MeshtasticBridge(options);

  // Handle graceful shutdown
  process.on('SIGINT', () => bridge.stop());
  process.on('SIGTERM', () => bridge.stop());

  await bridge.initialize();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MeshtasticBridge;