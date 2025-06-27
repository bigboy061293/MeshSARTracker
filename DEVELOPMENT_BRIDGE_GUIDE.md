# Development Bridge Guide - Connecting COM4 to Cloud Preview

This guide shows you how to bridge your local COM4 port to the cloud development environment, making development much simpler.

## The Problem

- **Cloud Environment**: Replit runs in a Linux container - no access to Windows COM ports
- **Your Hardware**: Drone connected to COM4 on your local Windows computer
- **Development Need**: Test with real hardware while developing in cloud

## The Solution: COM Bridge

The `com-bridge.js` tool forwards serial data from your local COM port to a network port that the cloud can access.

## Quick Setup

### Step 1: Install Bridge Dependencies (Local Computer)

```bash
# On your local computer where the drone is connected
npm install serialport

# Or if you don't have the full project locally
npm install -g serialport
```

### Step 2: Run the Bridge (Local Computer)

```bash
# Navigate to your project folder and run:
node com-bridge.js

# Or with custom settings:
node com-bridge.js --port COM4 --udp 14550
```

**Expected Output:**
```
🌉 MeshTac COM Bridge Starting...
📡 Serial: COM4 @ 57600 baud
🌐 UDP: 127.0.0.1:14550

✅ Bridge active - forwarding data from COM port to UDP
💡 Cloud app should connect to: udp:127.0.0.1:14550
⌨️  Press Ctrl+C to stop

📊 0:05 | 📡 RX: 1,234B | 🌐 TX: 1,234B | ❌ 0
```

### Step 3: Configure Cloud App

In the Replit settings page, set MAVLink connection to:
```
udp:127.0.0.1:14550
```

## Detailed Usage

### Bridge Commands

```bash
# Basic bridge with defaults
node com-bridge.js

# Custom COM port
node com-bridge.js --port COM5

# Custom UDP port
node com-bridge.js --udp 14551

# List available COM ports
node com-bridge.js --list

# Help
node com-bridge.js --help
```

### Bridge Options

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | COM4 | Serial port name |
| `--baud` | 57600 | Baud rate |
| `--udp` | 14550 | UDP port for forwarding |
| `--host` | 127.0.0.1 | UDP host |

### Development Workflow

1. **Connect Hardware**: Plug drone into COM4
2. **Start Bridge**: `node com-bridge.js`
3. **Develop in Cloud**: Use Replit with `udp:127.0.0.1:14550`
4. **Test Real Data**: Bridge forwards live MAVLink data
5. **Stop Bridge**: Ctrl+C when done

## Bridge Status Display

The bridge shows real-time status:

```
📊 2:30 | 📡 RX: 45,678B | 🌐 TX: 45,678B | ❌ 0
```

- **2:30**: Uptime (minutes:seconds)
- **📡 RX**: Bytes received from serial port
- **🌐 TX**: Bytes sent via UDP
- **❌ 0**: Error count

## Troubleshooting

### COM Port Issues

**"Failed to open COM4"**
- Check Device Manager for correct port
- Ensure no other programs are using the port
- Try different COM port: `--port COM5`

**"Permission denied"**
- Run command prompt as Administrator
- Check drone is properly connected

### Network Issues

**"UDP send error"**
- Usually not a problem - cloud may not be listening yet
- Start cloud app first, then bridge

### Connection Testing

**Check COM ports:**
```bash
node com-bridge.js --list
```

**Test specific port:**
```bash
node com-bridge.js --port COM3 --udp 14551
```

## Advanced Configuration

### Multiple Devices

Bridge different devices to different ports:

```bash
# Terminal 1: Drone on COM4 -> UDP 14550
node com-bridge.js --port COM4 --udp 14550

# Terminal 2: Meshtastic on COM5 -> UDP 14551
node com-bridge.js --port COM5 --udp 14551
```

### Remote Development

If your cloud environment is on a different computer:

```bash
# Bridge to remote cloud (replace with actual IP)
node com-bridge.js --host 192.168.1.100
```

### Firewall Settings

Ensure UDP port 14550 is allowed:
- Windows Defender Firewall
- Router settings (if remote)
- VPN settings (if applicable)

## Benefits of This Approach

1. **Real Hardware Testing**: Use actual drone data while developing
2. **Cloud Development**: Keep using Replit's convenient environment
3. **Live Updates**: See real telemetry in cloud dashboard
4. **Easy Switching**: Toggle between simulation and real data
5. **No Local Setup**: No need for full local development environment

## Integration with Settings

The MeshTac settings page supports both modes:

**For Bridge Mode:**
- Connection String: `udp:127.0.0.1:14550`
- Data Source: Real Device

**For Simulation Mode:**
- Connection String: Any value
- Data Source: Simulation

## Security Notes

- Bridge only runs on localhost by default
- No external network access unless configured
- Stop bridge when not needed
- Monitor connection logs for any issues

## Alternative Solutions

If the bridge doesn't work for you:

1. **Full Local Development**: Use the local deployment guide
2. **Network MAVLink**: Configure drone for direct network connection
3. **Companion Computer**: Use Raspberry Pi as bridge device

This bridge solution provides the best of both worlds - easy cloud development with real hardware connectivity.