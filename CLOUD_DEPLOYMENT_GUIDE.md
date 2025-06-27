# Cloud Deployment Guide for MeshTac

## Overview

MeshTac is designed to work in both local and cloud environments. This guide covers deploying the application in cloud environments where direct serial port access (like COM4) is not available.

## Connection Options for Cloud Deployment

### 1. Network-Based MAVLink Connections

Since cloud environments don't have direct access to local serial ports like COM4, use network-based connections:

#### UDP Connections (Recommended)
```
udp:HOST:PORT
```
**Examples:**
- `udp:192.168.1.100:14550` - Connect to drone on local network
- `udp:drone.local:14550` - Connect using hostname
- `udp:10.0.0.50:14550` - Connect to specific IP address

#### TCP Connections
```
tcp:HOST:PORT
```
**Examples:**
- `tcp:192.168.1.100:5760` - Connect via TCP
- `tcp:drone-gateway.local:5760` - Connect to TCP gateway

### 2. Setting Up Drone Hardware for Cloud Access

#### Option A: Network Bridge
Use a companion computer (Raspberry Pi, etc.) connected to your drone that bridges serial to network:

1. Connect companion computer to drone via serial
2. Run MAVLink-to-UDP bridge on companion computer
3. Connect MeshTac to companion computer's IP address

#### Option B: Direct Network Connection
Modern flight controllers with built-in WiFi/Ethernet:

1. Configure drone's network settings
2. Set up MAVLink over WiFi/Ethernet
3. Connect MeshTac directly to drone's network interface

#### Option C: VPN/Tunnel Connection
For remote drone access:

1. Set up VPN connection to drone's network
2. Use local network addressing through VPN
3. Connect MeshTac to VPN-accessible drone IP

## Configuration Steps

### 1. Update Connection String
In the Settings page, update the MAVLink connection string:

- **Local Development**: `udp:127.0.0.1:14550` (requires local MAVLink proxy)
- **Network Drone**: `udp:DRONE_IP:14550`
- **Gateway/Bridge**: `tcp:GATEWAY_IP:5760`

### 2. Environment Variables
For production deployment, set these environment variables:

```bash
# Database connection (provided by Replit)
DATABASE_URL=postgresql://...

# MAVLink configuration
MAVLINK_CONNECTION=udp:192.168.1.100:14550
MAVLINK_USE_SIMULATION=false

# Session security (provided by Replit)
SESSION_SECRET=...
```

### 3. Firewall Configuration
Ensure these ports are accessible:

- **UDP 14550**: Standard MAVLink port
- **TCP 5760**: Alternative MAVLink port
- **Custom ports**: As configured in your setup

## Troubleshooting

### Common Issues

1. **"COM4 not available in cloud"**
   - Solution: Use network connections instead of serial ports
   - Update connection string to UDP/TCP format

2. **"Connection timeout"**
   - Check network connectivity to drone
   - Verify firewall settings
   - Ensure drone is broadcasting MAVLink on correct port

3. **"No heartbeat from device"**
   - Verify drone is powered and armed
   - Check MAVLink output configuration on drone
   - Test connection with ground control station first

### Testing Connections

1. **Verify network connectivity:**
   ```bash
   ping DRONE_IP
   ```

2. **Test MAVLink port:**
   ```bash
   nc -u DRONE_IP 14550
   ```

3. **Monitor MAVLink traffic:**
   Use QGroundControl or Mission Planner to verify MAVLink stream

## Deployment Platforms

### Replit Deployment
- Automatic environment variable management
- Built-in PostgreSQL database
- No additional configuration needed for basic setup

### Other Cloud Platforms
- Set required environment variables
- Configure PostgreSQL database connection
- Ensure network access to drone systems

## Security Considerations

1. **Network Security:**
   - Use VPN for remote drone access
   - Implement IP whitelisting when possible
   - Monitor connection logs for unauthorized access

2. **Authentication:**
   - Enable proper user authentication
   - Use role-based access control
   - Regular security audits

3. **Data Protection:**
   - Encrypt sensitive telemetry data
   - Secure database connections
   - Regular backup procedures

## Performance Optimization

1. **Network Latency:**
   - Use local network connections when possible
   - Implement connection pooling
   - Monitor network quality

2. **Bandwidth Management:**
   - Configure appropriate MAVLink message rates
   - Implement data compression if needed
   - Monitor network usage

## Support

For additional deployment support:
- Check application logs in the Replit console
- Use the "Check Connection" feature in the Drone Control page
- Monitor WebSocket connections for real-time data flow