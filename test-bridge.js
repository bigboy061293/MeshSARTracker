#!/usr/bin/env node

/**
 * Test Bridge Connection
 * 
 * This script helps you test if the bridge is working correctly.
 * Run this AFTER starting the bridge to verify the connection.
 */

const dgram = require('dgram');

class BridgeTest {
  constructor() {
    this.testPort = 14550;
    this.testHost = '127.0.0.1';
    this.socket = null;
    this.receivedData = false;
    this.testDuration = 10000; // 10 seconds
  }

  async runTest() {
    console.log('🧪 Bridge Connection Test');
    console.log('========================');
    console.log('');
    console.log('Testing connection to bridge at:', `${this.testHost}:${this.testPort}`);
    console.log('Listening for MAVLink data...');
    console.log('');

    return new Promise((resolve) => {
      this.socket = dgram.createSocket('udp4');
      
      // Listen for data from bridge
      this.socket.on('message', (data, info) => {
        this.receivedData = true;
        console.log('✅ SUCCESS: Received data from bridge!');
        console.log(`📦 Data size: ${data.length} bytes`);
        console.log(`📡 From: ${info.address}:${info.port}`);
        console.log('');
        console.log('🎉 Bridge is working correctly!');
        console.log('Your drone data is flowing to the cloud.');
        this.cleanup();
        resolve(true);
      });

      this.socket.on('error', (err) => {
        console.log('❌ Socket error:', err.message);
        this.cleanup();
        resolve(false);
      });

      // Bind to the same port the bridge is sending to
      this.socket.bind(this.testPort, () => {
        console.log(`👂 Listening on port ${this.testPort}...`);
        
        // Set timeout
        setTimeout(() => {
          if (!this.receivedData) {
            console.log('⏰ Test timeout - no data received');
            console.log('');
            this.showTroubleshooting();
            this.cleanup();
            resolve(false);
          }
        }, this.testDuration);
      });
    });
  }

  showTroubleshooting() {
    console.log('🔍 Troubleshooting:');
    console.log('');
    console.log('1. Make sure the bridge is running:');
    console.log('   node com-bridge.js');
    console.log('');
    console.log('2. Check that your drone is connected and sending data');
    console.log('');
    console.log('3. Verify COM port in Device Manager');
    console.log('');
    console.log('4. Try different COM port:');
    console.log('   node com-bridge.js --port COM5');
    console.log('');
    console.log('5. Check if other software is using the COM port');
    console.log('   (Mission Planner, QGroundControl, etc.)');
  }

  cleanup() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Check command line arguments
if (process.argv.includes('--help')) {
  console.log(`
🧪 Bridge Connection Test

This script tests if the COM bridge is working correctly.

Usage:
  node test-bridge.js

Make sure to:
1. Start the bridge first: node com-bridge.js
2. Have your drone connected and powered
3. Run this test: node test-bridge.js

The test will listen for 10 seconds for data from the bridge.
  `);
  process.exit(0);
}

async function main() {
  const tester = new BridgeTest();
  
  console.log('📋 Prerequisites:');
  console.log('1. Bridge should be running: node com-bridge.js');
  console.log('2. Drone should be connected to COM port');
  console.log('3. Drone should be powered and sending data');
  console.log('');
  
  const success = await tester.runTest();
  
  if (success) {
    console.log('');
    console.log('✅ Next steps:');
    console.log('1. Go to Replit settings');
    console.log('2. Set connection to: udp:127.0.0.1:14550');
    console.log('3. Your cloud app will now receive real drone data!');
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  });
}

module.exports = BridgeTest;