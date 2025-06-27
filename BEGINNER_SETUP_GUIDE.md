# Beginner's Guide to Local Deployment

This guide assumes you're new to Node.js and walks you through everything step by step.

## What You'll Need

- A Windows computer (this guide focuses on Windows)
- About 30 minutes
- Internet connection for downloads

## Step 1: Install Node.js

### Download Node.js
1. Go to https://nodejs.org/
2. Click the green button that says "LTS" (Long Term Support)
3. This downloads a file like `node-v20.x.x-x64.msi`
4. Run the downloaded file
5. Click "Next" through all the installation steps
6. When finished, restart your computer

### Verify Installation
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. In the black window that opens, type: `node --version`
4. You should see something like `v20.15.0`
5. Type: `npm --version`
6. You should see something like `10.7.0`

## Step 2: Install PostgreSQL Database

### Option A: Easy Way (Docker)
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Skip to Step 4 (we'll set up the database automatically)

### Option B: Traditional Way
1. Go to https://www.postgresql.org/download/windows/
2. Download PostgreSQL 16
3. Run the installer
4. Remember the password you set for user "postgres"
5. Keep default port 5432

## Step 3: Download the Project

### If you have the code files:
1. Create a folder like `C:\MeshTac`
2. Copy all the project files there
3. Make sure you see files like `package.json`, `com-bridge.js`, etc.

### If you need to download from a repository:
1. Download as ZIP file
2. Extract to `C:\MeshTac`

## Step 4: Set Up the Project

### Open Command Prompt in Project Folder
1. Open Windows Explorer
2. Navigate to your project folder (like `C:\MeshTac`)
3. Click in the address bar where it shows the path
4. Type `cmd` and press Enter
5. A black command window opens in your project folder

### Run the Setup Script
Type this command and press Enter:
```
setup-local.bat
```

This script will:
- Check if Node.js is installed
- Install all required packages
- Create configuration files
- Set up database connection

### What You'll See
The script shows messages like:
```
✅ Node.js detected
✅ Dependencies installed
⚙️ Creating .env file...
```

## Step 5: Configure Your Settings

### Edit the .env File
1. In your project folder, find `.env` file
2. Right-click it and choose "Open with Notepad"
3. You'll see something like:

```
DATABASE_URL=postgresql://meshtac_user:your_password@localhost:5432/meshtac_dev
SESSION_SECRET=your-super-secret-session-key-change-this
MAVLINK_CONNECTION=COM4
MESHTASTIC_PORT=COM5
```

### Update Database Settings

**If you used Docker (Option A):**
- Leave DATABASE_URL as is
- We'll start the database next

**If you installed PostgreSQL (Option B):**
- Change `your_password` to the password you set during installation
- Change `meshtac_user` to `postgres`
- Change `meshtac_dev` to `postgres`

Example:
```
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/postgres
```

### Update Hardware Settings
- Change `COM4` to your drone's COM port (check Device Manager)
- Change `COM5` to your Meshtastic device's COM port
- If you don't have hardware yet, leave these as they are

## Step 6: Start the Database

### If Using Docker:
1. In command prompt, type: `docker-compose up -d postgres`
2. Wait for it to download and start
3. You should see "✅ Started"

### If Using PostgreSQL:
1. The database should already be running
2. You can check by opening "Services" in Windows
3. Look for "postgresql" service

## Step 7: Set Up Database Tables

In your command prompt, type:
```
npm run db:push
```

This creates all the necessary tables in your database.

## Step 8: Start the Application

Type this command:
```
npm run dev
```

You should see messages like:
```
WebSocket server initialized
MAVLink service initialized
serving on port 5000
```

## Step 9: Open the Application

1. Open your web browser
2. Go to: http://localhost:5000
3. You should see the MeshTac application

## Troubleshooting Common Issues

### "Node.js not found"
- Restart your computer after installing Node.js
- Make sure you downloaded from nodejs.org

### "Failed to install dependencies"
- Check your internet connection
- Run command prompt as Administrator

### "Database connection failed"
- Check your .env file password
- Make sure PostgreSQL is running
- For Docker: run `docker-compose up -d postgres`

### "Port 5000 already in use"
- Close other applications that might use port 5000
- Restart your computer

### "COM4 not found"
- This is normal if you don't have a drone connected
- The app will work in simulation mode

## Testing Your Setup

### Check the Dashboard
- Go to http://localhost:5000
- You should see the main dashboard
- Try clicking on different menu items

### Check Database
- Type in command prompt: `npm run db:studio`
- This opens a database viewer in your browser
- You can see all the tables that were created

### Test Hardware Connection (Optional)
- Connect your drone to COM4
- Go to Settings page in the app
- Click "Check Connection"
- You should see connection status

## What's Next?

### For Development:
- The app automatically reloads when you change files
- Check the console for any error messages
- Use browser Developer Tools (F12) to debug

### For Hardware Testing:
- Connect your Meshtastic device
- Connect your drone
- Update COM ports in Settings
- Test connections on respective pages

### For Deployment:
- Use `npm run build` to create production files
- Use `npm start` to run in production mode

## Getting Help

### Common Locations:
- Project files: `C:\MeshTac` (or wherever you put them)
- Configuration: `.env` file in project folder
- Logs: Command prompt where you ran `npm run dev`

### If Something Goes Wrong:
1. Close the application (Ctrl+C in command prompt)
2. Check the error messages
3. Make sure all prerequisites are installed
4. Try the setup script again: `setup-local.bat`
5. Check the .env file configuration

### Useful Commands:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Update database
- `npm run db:studio` - Open database viewer

Remember: This is a development setup. For production use on a server, additional security and configuration steps are needed.