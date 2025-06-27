# How to Verify COM4 → Cloud Bridge Is Working

## Quick Visual Check (Easiest Method)

### 1. Open Settings Page
- Go to your Replit preview mode
- Click "Settings" in the sidebar  
- Scroll down to see the **Bridge Connection** monitor

### 2. What You'll See

**✅ Working Bridge:**
```
Bridge Connection                    [Active]
Messages Received: 1,234
Data Transferred: 45.6 KB
Last Message: 2s ago
🟢 Receiving live data from local hardware
```

**⚠️ Bridge Started But No Data:**
```
Bridge Connection                    [Inactive]  
Messages Received: 0
Data Transferred: 0 B
Last Message: Never
💡 Waiting for bridge connection
Start the cloud bridge: node cloud-bridge.js --url https://your-repl.replit.dev
```

**❌ Bridge Never Connected:**
```
Bridge Connection                    [No Data]
Messages Received: 0  
Data Transferred: 0 B
Last Message: Never
```

## Step-by-Step Verification

### Step 1: Check Cloud Bridge Status
On your **local computer** where you started the bridge:

**✅ Good Output:**
```
☁️  Cloud Bridge Starting...
✅ Cloud connection successful  
✅ Connected to COM4
📊 2:30 | 📡 RX: 45KB | ☁️  TX: 45KB | ❌ 0
```

**❌ Problems:**
```
❌ Cannot reach cloud app: ECONNREFUSED
❌ Failed to open COM4: Access denied
❌ Cloud returned status 404
```

### Step 2: Check Cloud Console Logs
In your **Replit console** (bottom panel), look for:

**✅ Success Messages:**
```
🌉 Bridge received 64 bytes from local hardware at 2025-01-27T10:45:23.456Z
🌉 Bridge received 32 bytes from local hardware at 2025-01-27T10:45:24.123Z
```

**❌ No Messages:** If you don't see these, the bridge isn't reaching the cloud.

### Step 3: Test Bridge API Directly

**Test Cloud Connectivity:**
```bash
# On your local computer
curl https://your-repl.replit.dev/api/bridge/test
```

**Expected Response:**
```json
{"status":"ok","message":"Bridge connection successful"}
```

**Test Bridge Status:**
```bash
curl https://your-repl.replit.dev/api/bridge/status
```

**Expected Response:**
```json
{
  "totalMessages": 1234,
  "totalBytes": 45678,
  "lastReceived": "2025-01-27T10:45:23.456Z",
  "isActive": true,
  "formattedBytes": "44.6 KB",
  "secondsSinceLastMessage": 2
}
```

## Real-Time Monitoring

### Browser Console (F12)
Open browser developer tools and watch for:

**✅ Active WebSocket:**
```
WebSocket connected
```

**❌ Connection Issues:**
```
WebSocket error: [object Event]
WebSocket disconnected: 1006
```

### Bridge Connection Indicator
The Bridge Monitor updates every 2 seconds. Watch for:
- **Messages Received** counter increasing
- **Data Transferred** size growing  
- **Last Message** timestamp updating
- Green **"Active"** badge

## Troubleshooting Common Issues

### Issue: "No Data" Status

**Cause:** Bridge never started or can't reach cloud

**Fix:**
1. Check your Replit URL is correct
2. Verify drone is connected to COM4
3. Run: `node cloud-bridge.js --url https://your-actual-repl-url.replit.dev`

### Issue: "Inactive" Status  

**Cause:** Bridge connected but stopped sending data

**Fix:**
1. Check local bridge is still running
2. Verify drone is powered and sending data  
3. Check COM port in Device Manager
4. Try different baud rate: `--baud 115200`

### Issue: Bridge Shows Activity But No Drone Data

**Cause:** Bridge forwarding data but drone isn't actually sending MAVLink

**Fix:**
1. Check drone autopilot is powered
2. Verify MAVLink output is enabled
3. Test with different drone software
4. Try Mission Planner first to verify COM4 works

### Issue: Cloud Console Shows Errors

**Common Errors:**
```bash
# Bridge API error: No data provided
# Fix: Bridge isn't sending proper data format

# Bridge API error: Cannot read property
# Fix: Restart the cloud app

# ECONNREFUSED
# Fix: Wrong URL or cloud app not running
```

## Advanced Verification

### Manual Data Test
Send test data to bridge API:

```bash
curl -X POST https://your-repl.replit.dev/api/bridge/mavlink \
  -H "Content-Type: application/json" \
  -d '{"data":"SGVsbG8gV29ybGQ="}'
```

Should return:
```json
{"status":"ok","received":11,"timestamp":"2025-01-27T10:45:23.456Z"}
```

### Multiple Bridge Instances
You can run multiple bridges for different devices:

```bash
# Terminal 1 - Drone
node cloud-bridge.js --port COM4 --url https://your-repl.replit.dev

# Terminal 2 - Meshtastic  
node cloud-bridge.js --port COM5 --url https://your-repl.replit.dev
```

Each will show up separately in the bridge monitor.

## Success Checklist

**✅ Complete Success:**
- [ ] Local bridge shows "Active" with increasing RX/TX counters
- [ ] Cloud bridge monitor shows "Active" status  
- [ ] Message count increasing in real-time
- [ ] Cloud console logs showing bridge data received
- [ ] Last message timestamp updating every few seconds
- [ ] No error messages in either local or cloud console

**✅ Your setup is working when:**
1. You see live telemetry data from your real drone
2. GPS coordinates change when you move the drone
3. Battery levels reflect actual drone status
4. Flight modes match what drone is actually doing

Now you have real hardware data flowing into your cloud development environment!