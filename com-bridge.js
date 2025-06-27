#!/usr/bin/env node

/**
 * COM Port Bridge for MeshTac Development
 * 
 * This tool creates a bridge between local COM ports and the cloud development environment.
 * It forwards MAVLink data from COM4 to a UDP port that the cloud app can access.
 * 
 * Usage:
 *   node com-bridge.js
 *   node com-bridge.js --port COM5 --udp 14551
 */

const { SerialPort } = require('serialport');
const dgram = require('dgram');

class COMBridge {
  constructor(options = {}) {
    this.serialPortName = options.port || 'COM4';
    this.serialBaudRate = options.baud || 57600;
    this.udpPort = options.udp || 14550;
    this.udpHost = options.host || '127.0.0.1';
    
    this.serialPort = null;
    this.udpSocket = null;
    this.isRunning = false;
    this.stats = {
      serialReceived: 0,
      udpSent: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    console.log('🌉 MeshTac COM Bridge Starting...');
    console.log(`📡 Serial: ${this.serialPortName} @ ${this.serialBaudRate} baud`);
    console.log(`🌐 UDP: ${this.udpHost}:${this.udpPort}`);
    console.log('');

    try {
      await this.setupSerial();
      await this.setupUDP();
      this.setupStatusDisplay();
      this.isRunning = true;
      
      console.log('✅ Bridge active - forwarding data from COM port to UDP');
      console.log('💡 Cloud app should connect to: udp:127.0.0.1:' + this.udpPort);
      console.log('⌨️  Press Ctrl+C to stop');
      console.log('');
      
    } catch (error) {
      console.error('❌ Failed to initialize bridge:', error.message);
      process.exit(1);
    }
  }

  async setupSerial() {
    return new Promise((resolve, reject) => {
      try {
        this.serialPort = new SerialPort({
          path: this.serialPortName,
          baudRate: this.serialBaudRate,
          autoOpen: false
        });

        this.serialPort.open((err) => {
          if (err) {
            reject(new Error(`Failed to open ${this.serialPortName}: ${err.message}`));
            return;
          }

          this.serialPort.on('data', (data) => {
            this.handleSerialData(data);
          });

          this.serialPort.on('error', (err) => {
            console.error('📡 Serial error:', err.message);
            this.stats.errors++;
          });

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async setupUDP() {
    this.udpSocket = dgram.createSocket('udp4');
    
    this.udpSocket.on('error', (err) => {
      console.error('🌐 UDP error:', err.message);
      this.stats.errors++;
    });
  }

  handleSerialData(data) {
    this.stats.serialReceived += data.length;
    
    // Forward raw MAVLink data to UDP
    this.udpSocket.send(data, this.udpPort, this.udpHost, (err) => {
      if (err) {
        console.error('🌐 UDP send error:', err.message);
        this.stats.errors++;
      } else {
        this.stats.udpSent += data.length;
      }
    });
  }

  setupStatusDisplay() {
    // Display stats every second
    setInterval(() => {
      if (!this.isRunning) return;
      
      const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
      const uptimeStr = `${Math.floor(uptime / 60)}:${(uptime % 60).toString().padStart(2, '0')}`;
      
      process.stdout.write('\r\x1b[K'); // Clear line
      process.stdout.write(
        `📊 ${uptimeStr} | ` +
        `📡 RX: ${this.stats.serialReceived}B | ` +
        `🌐 TX: ${this.stats.udpSent}B | ` +
        `❌ ${this.stats.errors}`
      );
    }, 1000);
  }

  async listSerialPorts() {
    try {
      const ports = await SerialPort.list();
      console.log('📡 Available Serial Ports:');
      console.log('');
      
      if (ports.length === 0) {
        console.log('  No serial ports found');
        return;
      }
      
      ports.forEach((port, index) => {
        console.log(`  ${index + 1}. ${port.path}`);
        if (port.manufacturer) console.log(`     Manufacturer: ${port.manufacturer}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to list serial ports:', error.message);
    }
  }

  async stop() {
    console.log('\n\n🛑 Stopping bridge...');
    this.isRunning = false;
    
    if (this.serialPort && this.serialPort.isOpen) {
      await new Promise(resolve => this.serialPort.close(resolve));
    }
    
    if (this.udpSocket) {
      this.udpSocket.close();
    }
    
    console.log('✅ Bridge stopped');
    process.exit(0);
  }
}

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
      case '-p':
        options.port = args[++i];
        break;
      case '--baud':
      case '-b':
        options.baud = parseInt(args[++i]);
        break;
      case '--udp':
      case '-u':
        options.udp = parseInt(args[++i]);
        break;
      case '--host':
      case '-h':
        options.host = args[++i];
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      case '--help':
        console.log(`
🌉 MeshTac COM Bridge - Forward serial data to UDP

Usage:
  node com-bridge.js [options]

Options:
  -p, --port <port>    Serial port (default: COM4)
  -b, --baud <rate>    Baud rate (default: 57600)
  -u, --udp <port>     UDP port (default: 14550)
  -h, --host <host>    UDP host (default: 127.0.0.1)
  -l, --list           List available serial ports
  --help               Show this help

Examples:
  node com-bridge.js
  node com-bridge.js --port COM5 --udp 14551
  node com-bridge.js --list
        `);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

async function main() {
  const options = parseArgs();
  const bridge = new COMBridge(options);
  
  if (options.list) {
    await bridge.listSerialPorts();
    return;
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', () => bridge.stop());
  process.on('SIGTERM', () => bridge.stop());
  
  await bridge.initialize();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Bridge error:', error.message);
    process.exit(1);
  });
}

module.exports = COMBridge;