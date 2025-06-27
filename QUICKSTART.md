# MeshTac QuickStart - Get Running in 10 Minutes

This is the fastest way to get MeshTac running on your computer. Perfect for beginners.

## What This Does

MeshTac is a communication app for drones and mesh networks. You'll get:
- Web dashboard at http://localhost:5000
- Real-time maps and messaging
- Drone control interface
- Mesh network monitoring

## Prerequisites (5 minutes)

### 1. Install Node.js
- Go to https://nodejs.org
- Download the LTS version (green button)
- Run the installer, click Next through everything
- **Restart your computer**

### 2. Install Database (Choose One)

**Option A: Docker (Recommended)**
- Download Docker Desktop from https://docker.com
- Install and restart your computer

**Option B: PostgreSQL**
- Download from https://postgresql.org/download
- Install with default settings
- Remember your password

## Setup (3 minutes)

### 1. Get the Project Files
- Download the project as a ZIP file
- Extract to a folder like `C:\MeshTac`
- Make sure you see files like `package.json` and `setup-local.bat`

### 2. Run Setup
- Open Windows Explorer
- Go to your project folder
- Click in the address bar and type `cmd`
- Press Enter (opens command prompt)
- Type: `setup-local.bat`
- Press Enter and wait

### 3. Configure Database
The setup creates a `.env` file. Edit it:

**For Docker:**
```
DATABASE_URL=postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev
```

**For PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
```
(Replace YOUR_PASSWORD with what you set during install)

## Start Everything (2 minutes)

### 1. Start Database
**Docker users:** `docker-compose up -d postgres`
**PostgreSQL users:** Database should already be running

### 2. Setup Database Tables
```
npm run db:push
```

### 3. Start the App
```
npm run dev
```

### 4. Open Your Browser
Go to: http://localhost:5000

## You're Done!

You should see the MeshTac dashboard. You can:
- Click around the interface
- Check the Settings page
- View the Map page
- Try the Communications panel

## Test Your Setup

### Basic Test
- Dashboard loads at http://localhost:5000
- No error messages in command prompt
- All menu items work

### Hardware Test (Optional)
- Connect drone to USB (COM port)
- Go to Settings > MAVLink Configuration
- Change connection to your COM port (like COM4)
- Click "Check Connection"

## Common Issues

### "Node.js not found"
- Did you restart after installing Node.js?
- Download from nodejs.org, not other sites

### "npm command not found"
- Node.js installation included npm
- Restart your computer
- Reinstall Node.js if needed

### "Database connection failed"
- Check your .env file has correct password
- For Docker: run `docker-compose up -d postgres`
- For PostgreSQL: check Windows Services for postgresql

### "Port 5000 in use"
- Something else is using that port
- Restart your computer
- Or change port in package.json

### "Permission denied"
- Run command prompt as Administrator
- Right-click Command Prompt, "Run as administrator"

## Next Steps

### Development
- Files auto-reload when you make changes
- Check command prompt for error messages
- Use F12 in browser for debugging

### Hardware
- Connect Meshtastic devices
- Connect MAVLink drones
- Update COM ports in Settings

### Production
- Run `npm run build` for production files
- Run `npm start` for production mode

## Getting Help

### Check These:
- Command prompt for error messages
- Browser console (F12)
- .env file configuration
- Device Manager for COM ports

### Files to Know:
- `.env` - Your configuration
- `package.json` - Project settings
- `README.md` - Project overview

### Useful Commands:
```bash
npm run dev        # Start development
npm run build      # Build for production
npm run db:push    # Update database
npm run db:studio  # Open database viewer
```

That's it! You now have a fully functional MeshTac installation on your computer.