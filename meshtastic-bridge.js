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
    
    // Send raw Meshtastic data to cloud
    this.sendToCloud(data);
  }

  async sendToCloud(data) {
    try {
      const response = await axios.post(`${this.cloudUrl}/api/bridge/meshtastic`, data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Bridge-Type': 'meshtastic'
        },
        timeout: 5000
      });

      if (response.status === 200) {
        this.totalBytesSent += data.length;
        this.totalPacketsSent++;
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