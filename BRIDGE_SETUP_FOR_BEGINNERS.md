# Cloud Bridge Setup for Beginners

## What You're Doing

You have a drone connected to COM4 on your Windows computer, but you're developing in the cloud (Replit). The cloud bridge reads data from your local COM port and sends it to the cloud app via the internet, so you can test with real hardware.

## How the Cloud Bridge Works

**Your Computer (Local)** → **Internet** → **Replit (Cloud)**
- `cloud-bridge.js` reads from COM4 on your computer
- Sends data over internet to your Replit app URL
- Cloud app receives real drone data as if connected directly

## Before You Start

**You Need:**
- Windows computer with drone connected to COM4
- Node.js installed (if not: download from nodejs.org)
- The MeshTac project files on your computer

## Step 1: Download Project Files to Your Computer

### Get the Files
1. Download the MeshTac project as a ZIP file
2. Extract to a folder like `C:\MeshTac`
3. Make sure you see these files:
   - `com-bridge.js`
   - `package.json`
   - `setup-local.bat`

## Step 2: Install Dependencies

### Open Command Prompt
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. Navigate to your project folder:
   ```
   cd C:\MeshTac
   ```

### Install Required Packages
```bash
npm install serialport
```

This downloads the package needed to communicate with COM ports.

## Step 3: Check Your COM Port

### Find Your Drone's COM Port
1. Right-click "This PC" → Properties → Device Manager
2. Expand "Ports (COM & LPT)"
3. Look for your drone (might be "USB Serial Port" or similar)
4. Note the COM number (like COM4, COM5, etc.)

### Test if Port is Available
```bash
node com-bridge.js --list
```

This shows all available COM ports. You should see your drone's port listed.

## Step 4: Start the Cloud Bridge

### Get Your Replit URL
1. In your Replit project, copy the URL from the address bar
2. It looks like: `https://abc123-def456.replit.dev`

### Start Cloud Bridge
```bash
node cloud-bridge.js --url https://your-repl-url.replit.dev
```

Replace `https://your-repl-url.replit.dev` with your actual Replit URL.

### Custom COM Port
If your drone is on a different port:
```bash
node cloud-bridge.js --port COM5 --url https://your-repl-url.replit.dev
```

### What You Should See
```
☁️  MeshTac Cloud Bridge Starting...
📡 Serial: COM4 @ 57600 baud
🌐 Cloud: https://your-repl.replit.dev

🔍 Testing cloud connection...
✅ Cloud connection successful
🔌 Connecting to COM port...
✅ Connected to COM4

✅ Bridge active - forwarding data from COM port to cloud
💡 Your cloud app will now receive real drone data
⌨️  Press Ctrl+C to stop

📊 2:30 | 📡 RX: 45,678B | ☁️  TX: 45,678B | ❌ 0
```

## Step 5: Cloud App Configuration

### No Configuration Needed!
The cloud bridge automatically sends data to your Replit app. The cloud app will:
- Automatically receive your real drone data
- Display it in the Drone Control page
- Show live telemetry and GPS coordinates

### Verify It's Working
1. Open your Replit app in browser
2. Go to Drone Control page
3. You should see live data from your real drone

## Step 6: Verify Everything Works

### Real-Time Data Flow
With both bridge and cloud app running:
- Bridge shows data being received (📡 RX increasing)
- Bridge shows data being sent (🌐 TX increasing)
- Cloud dashboard shows live drone data

### Bridge Status Display
```
📊 2:30 | 📡 RX: 45,678B | 🌐 TX: 45,678B | ❌ 0
```
- **2:30**: Bridge has been running for 2 minutes 30 seconds
- **📡 RX**: Bytes received from your drone
- **🌐 TX**: Bytes sent to cloud
- **❌ 0**: No errors (good!)

## Common Issues and Solutions

### "Failed to open COM4"
**Problem:** Another program is using the port
**Solution:** 
- Close other drone software (Mission Planner, QGroundControl)
- Try a different COM port: `node com-bridge.js --port COM5`

### "Node command not found"
**Problem:** Node.js not installed or not in PATH
**Solution:**
- Download Node.js from nodejs.org
- Restart your computer after installation

### "Cannot find module 'serialport'"
**Problem:** Package not installed
**Solution:**
```bash
npm install serialport
```

### "Permission denied"
**Problem:** Windows permissions
**Solution:**
- Run command prompt as Administrator
- Right-click Command Prompt → "Run as administrator"

### Bridge runs but no data
**Problem:** Drone not sending data or wrong settings
**Solution:**
- Check drone is powered on
- Verify baud rate (try `--baud 115200`)
- Check COM port in Device Manager

## Advanced Usage

### Multiple Devices
Run separate bridges for different devices:

**Terminal 1 (Drone):**
```bash
node com-bridge.js --port COM4 --udp 14550
```

**Terminal 2 (Meshtastic):**
```bash
node com-bridge.js --port COM5 --udp 14551
```

### Custom Settings
```bash
# Different baud rate
node com-bridge.js --port COM4 --baud 115200

# Different UDP port
node com-bridge.js --port COM4 --udp 14551

# Help and options
node com-bridge.js --help
```

## Development Workflow

### Daily Usage
1. **Start Bridge:** `node com-bridge.js`
2. **Develop in Cloud:** Use Replit normally
3. **Test with Real Data:** Bridge forwards live telemetry
4. **Stop Bridge:** Ctrl+C when done

### Switching Modes
**Real Hardware:**
- Start bridge
- Set connection to `udp:127.0.0.1:14550`

**Simulation:**
- Stop bridge (Ctrl+C)
- Keep any connection string
- App automatically uses simulation

## Troubleshooting Checklist

**Bridge Won't Start:**
- [ ] Node.js installed and working (`node --version`)
- [ ] In correct project folder
- [ ] serialport package installed (`npm install serialport`)

**Bridge Starts but No Data:**
- [ ] Drone connected and powered
- [ ] Correct COM port (`node com-bridge.js --list`)
- [ ] No other software using the port
- [ ] Correct baud rate (try 57600 or 115200)

**Cloud Won't Connect:**
- [ ] Bridge is running
- [ ] Connection string is `udp:127.0.0.1:14550`
- [ ] No firewall blocking port 14550

**Data Not Flowing:**
- [ ] Bridge shows increasing RX bytes
- [ ] Bridge shows increasing TX bytes
- [ ] Cloud shows "Connected" status
- [ ] Drone is actually sending MAVLink data

## Getting Help

**Check These Files:**
- Command prompt where bridge is running (error messages)
- Device Manager (COM port numbers)
- Windows Firewall settings (allow Node.js)

**Useful Commands:**
```bash
node com-bridge.js --help     # Show all options
node com-bridge.js --list     # List COM ports
node --version               # Check Node.js version
npm --version               # Check npm version
```

## Success Indicators

You know it's working when:
- Bridge shows data flowing (RX and TX counters increasing)
- Cloud dashboard shows "Connected" to drone
- Real telemetry data appears in cloud interface
- No error messages in bridge or cloud console

Now you have real hardware data flowing into your cloud development environment!