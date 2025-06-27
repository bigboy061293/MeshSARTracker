#!/usr/bin/env node

/**
 * Cloud Bridge for MeshTac Development
 * 
 * This tool connects your local COM port to the cloud Replit app.
 * It reads data from your drone and sends it to the cloud via HTTP.
 * 
 * Usage:
 *   node cloud-bridge.js --url https://your-repl.replit.dev
 *   node cloud-bridge.js --port COM5 --url https://your-repl.replit.dev
 */

const { SerialPort } = require('serialport');
const https = require('https');
const http = require('http');

class CloudBridge {
  constructor(options = {}) {
    this.serialPortName = options.port || 'COM4';
    this.serialBaudRate = options.baud || 57600;
    this.cloudUrl = options.url || null;
    
    this.serialPort = null;
    this.isRunning = false;
    this.stats = {
      serialReceived: 0,
      cloudSent: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    if (!this.cloudUrl) {
      console.log('❌ Error: Cloud URL required');
      console.log('Usage: node cloud-bridge.js --url https://your-repl.replit.dev');
      process.exit(1);
    }
  }

  async initialize() {
    console.log('☁️  MeshTac Cloud Bridge Starting...');
    console.log(`📡 Serial: ${this.serialPortName} @ ${this.serialBaudRate} baud`);
    console.log(`🌐 Cloud: ${this.cloudUrl}`);
    console.log('');

    try {
      await this.testCloudConnection();
      await this.setupSerial();
      this.setupStatusDisplay();
      this.isRunning = true;
      
      console.log('✅ Bridge active - forwarding data from COM port to cloud');
      console.log('💡 Your cloud app will now receive real drone data');
      console.log('⌨️  Press Ctrl+C to stop');
      console.log('');
    } catch (error) {
      console.log('❌ Bridge failed to start:', error.message);
      process.exit(1);
    }
  }

  async testCloudConnection() {
    console.log('🔍 Testing cloud connection...');
    
    return new Promise((resolve, reject) => {
      const url = new URL('/api/bridge/test', this.cloudUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Cloud connection successful');
          resolve();
        } else {
          reject(new Error(`Cloud returned status ${res.statusCode}`));
        }
      });
      
      req.on('error', (error) => {
        reject(new Error(`Cannot reach cloud app: ${error.message}`));
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Cloud connection timeout - check URL'));
      });
    });
  }

  async setupSerial() {
    console.log('🔌 Connecting to COM port...');
    
    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort({
        path: this.serialPortName,
        baudRate: this.serialBaudRate,
        autoOpen: false
      });

      this.serialPort.open((error) => {
        if (error) {
          reject(new Error(`Failed to open ${this.serialPortName}: ${error.message}`));
          return;
        }
        
        console.log(`✅ Connected to ${this.serialPortName}`);
        
        this.serialPort.on('data', (data) => {
          this.handleSerialData(data);
        });

        this.serialPort.on('error', (error) => {
          console.log('❌ Serial error:', error.message);
          this.stats.errors++;
        });

        resolve();
      });
    });
  }

  handleSerialData(data) {
    this.stats.serialReceived += data.length;
    
    // Send to cloud
    this.sendToCloud(data).catch(error => {
      this.stats.errors++;
      // Don't spam console with errors, just count them
    });
  }

  async sendToCloud(data) {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/bridge/mavlink', this.cloudUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const postData = data.toString('base64');
      const postDataString = JSON.stringify({ data: postData });
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postDataString)
        }
      };

      const req = client.request(options, (res) => {
        if (res.statusCode === 200) {
          this.stats.cloudSent += data.length;
          resolve();
        } else {
          reject(new Error(`Cloud API error: ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Cloud request timeout'));
      });
      
      req.write(postDataString);
      req.end();
    });
  }

  setupStatusDisplay() {
    setInterval(() => {
      if (!this.isRunning) return;
      
      const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
      const minutes = Math.floor(uptime / 60);
      const seconds = uptime % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Clear line and show status
      process.stdout.write('\r\x1b[K');
      process.stdout.write(
        `📊 ${timeStr} | 📡 RX: ${this.formatBytes(this.stats.serialReceived)} | ☁️  TX: ${this.formatBytes(this.stats.cloudSent)} | ❌ ${this.stats.errors}`
      );
    }, 1000);
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
    return Math.round(bytes / (1024 * 1024)) + 'MB';
  }

  async listSerialPorts() {
    try {
      const ports = await SerialPort.list();
      console.log('Available COM ports:');
      ports.forEach(port => {
        console.log(`  ${port.path} - ${port.manufacturer || 'Unknown'}`);
      });
    } catch (error) {
      console.log('❌ Failed to list ports:', error.message);
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    console.log('\n🛑 Bridge stopped');
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        options.port = args[++i];
        break;
      case '--baud':
        options.baud = parseInt(args[++i]);
        break;
      case '--url':
        options.url = args[++i];
        break;
      case '--list':
        return { list: true };
      case '--help':
        return { help: true };
    }
  }
  
  return options;
}

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    console.log(`
☁️  Cloud Bridge for MeshTac

Connects your local drone to the cloud development environment.

Usage:
  node cloud-bridge.js --url https://your-repl.replit.dev
  node cloud-bridge.js --port COM5 --url https://your-repl.replit.dev

Options:
  --port <port>    COM port (default: COM4)
  --baud <rate>    Baud rate (default: 57600)  
  --url <url>      Cloud app URL (required)
  --list           List available COM ports
  --help           Show this help

Examples:
  node cloud-bridge.js --url https://abc123.replit.dev
  node cloud-bridge.js --port COM3 --baud 115200 --url https://abc123.replit.dev
    `);
    return;
  }
  
  if (options.list) {
    const bridge = new CloudBridge();
    await bridge.listSerialPorts();
    return;
  }
  
  const bridge = new CloudBridge(options);
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    await bridge.stop();
    process.exit(0);
  });
  
  await bridge.initialize();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Bridge error:', error.message);
    process.exit(1);
  });
}

module.exports = CloudBridge;