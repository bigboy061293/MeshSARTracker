import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupWebSocket } from "./services/websocket";
import { meshtasticService } from "./services/meshtastic";
import { mavlinkService } from "./services/mavlink";
import { insertNodeSchema, insertMessageSchema, insertDroneSchema, insertMissionSchema, insertSharedMapSchema } from "@shared/schema";

// Helper function for formatting bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Role-based middleware
const requireRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    
    if (!user || !roles.includes(user.role || "user")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Node management routes
  app.get('/api/nodes', isAuthenticated, async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  app.post('/api/nodes', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const nodeData = insertNodeSchema.parse(req.body);
      const node = await storage.upsertNode(nodeData);
      res.json(node);
    } catch (error) {
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  // Message routes
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getRecentMessages(limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, requireRole(['admin', 'user']), async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.insertMessage(messageData);
      
      // Send message via Meshtastic
      await meshtasticService.sendMessage(message.toNodeId!, message.content);
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Drone routes
  app.get('/api/drones', isAuthenticated, async (req, res) => {
    try {
      const drones = await storage.getAllDrones();
      res.json(drones);
    } catch (error) {
      console.error("Error fetching drones:", error);
      res.status(500).json({ message: "Failed to fetch drones" });
    }
  });

  app.post('/api/drones/:id/command', isAuthenticated, requireRole(['admin', 'user']), async (req, res) => {
    try {
      const droneId = parseInt(req.params.id);
      const { command, parameters } = req.body;
      
      const result = await mavlinkService.sendCommand(droneId, command, parameters);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error sending drone command:", error);
      res.status(500).json({ message: "Failed to send drone command" });
    }
  });

  // Mission routes
  app.get('/api/missions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const missions = await storage.getMissions(userId);
      res.json(missions);
    } catch (error) {
      console.error("Error fetching missions:", error);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });

  app.post('/api/missions', isAuthenticated, requireRole(['admin', 'user']), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const missionData = insertMissionSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const mission = await storage.createMission(missionData);
      res.json(mission);
    } catch (error) {
      console.error("Error creating mission:", error);
      res.status(500).json({ message: "Failed to create mission" });
    }
  });

  // Shared map routes
  app.get('/api/shared-maps/:id', async (req, res) => {
    try {
      const mapId = req.params.id;
      const sharedMap = await storage.getSharedMap(mapId);
      
      if (!sharedMap) {
        return res.status(404).json({ message: "Shared map not found" });
      }
      
      if (!sharedMap.isPublic && !req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      res.json(sharedMap);
    } catch (error) {
      console.error("Error fetching shared map:", error);
      res.status(500).json({ message: "Failed to fetch shared map" });
    }
  });

  app.post('/api/shared-maps', isAuthenticated, requireRole(['admin', 'user']), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const mapData = insertSharedMapSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const sharedMap = await storage.createSharedMap(mapData);
      res.json(sharedMap);
    } catch (error) {
      console.error("Error creating shared map:", error);
      res.status(500).json({ message: "Failed to create shared map" });
    }
  });

  // System status route
  app.get('/api/status', isAuthenticated, async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      const drones = await storage.getAllDrones();
      const activeNodes = nodes.filter(n => n.isOnline).length;
      const connectedDrones = drones.filter(d => d.isConnected).length;
      
      res.json({
        activeNodes,
        totalNodes: nodes.length,
        connectedDrones,
        totalDrones: drones.length,
        meshtasticConnected: meshtasticService.isConnected(),
        mavlinkConnected: mavlinkService.isConnected(),
      });
    } catch (error) {
      console.error("Error fetching system status:", error);
      res.status(500).json({ message: "Failed to fetch system status" });
    }
  });

  // MAVLink configuration endpoints
  app.get('/api/mavlink/data-source', isAuthenticated, async (req, res) => {
    try {
      const dataSource = mavlinkService.getDataSource();
      res.json({ dataSource });
    } catch (error) {
      console.error('Error getting MAVLink data source:', error);
      res.status(500).json({ message: 'Failed to get data source' });
    }
  });

  app.post('/api/mavlink/data-source', isAuthenticated, async (req, res) => {
    try {
      const { useSimulation } = req.body;
      
      if (typeof useSimulation !== 'boolean') {
        return res.status(400).json({ message: 'useSimulation must be a boolean' });
      }
      
      mavlinkService.setDataSource(useSimulation);
      res.json({ success: true, dataSource: mavlinkService.getDataSource() });
    } catch (error) {
      console.error('Error setting MAVLink data source:', error);
      res.status(500).json({ message: 'Failed to set data source' });
    }
  });

  // MAVLink connection status endpoint
  app.get('/api/mavlink/connection-status', isAuthenticated, async (req, res) => {
    try {
      const status = mavlinkService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting MAVLink connection status:', error);
      res.status(500).json({ message: 'Failed to get connection status' });
    }
  });

  // Settings endpoints
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const mavlinkSettings = await storage.getSettingsByCategory('mavlink');
      const meshtasticSettings = await storage.getSettingsByCategory('meshtastic');
      const mapSettings = await storage.getSettingsByCategory('map');
      const notificationSettings = await storage.getSettingsByCategory('notifications');
      const systemSettings = await storage.getSettingsByCategory('system');
      
      res.json({
        mavlink: mavlinkSettings,
        meshtastic: meshtasticSettings,
        map: mapSettings,
        notifications: notificationSettings,
        system: systemSettings,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const settings = req.body;
      
      const savedSettings = [];
      
      for (const [key, value] of Object.entries(settings)) {
        const category = key.startsWith('mavlink') ? 'mavlink' : 
                        key.startsWith('meshtastic') ? 'meshtastic' :
                        key.startsWith('map') ? 'map' :
                        key.startsWith('notification') ? 'notifications' :
                        'system';
        
        const setting = await storage.setSetting({
          key,
          value: String(value),
          category,
          updatedBy: userId,
        });
        savedSettings.push(setting);
      }
      
      // If MAVLink connection string changed, reinitialize service
      let connectionResult = null;
      if (settings.mavlinkConnection) {
        connectionResult = await mavlinkService.updateConnection(settings.mavlinkConnection);
      }
      
      res.json({ 
        message: "Settings saved successfully", 
        settings: savedSettings,
        connectionResult 
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  const httpServer = createServer(app);
  
  // Bridge API endpoints for cloud connectivity
  app.get('/api/bridge/test', (req, res) => {
    res.json({ status: 'ok', message: 'Bridge connection successful' });
  });

  app.post('/api/bridge/mavlink', async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'No data provided' });
      }
      
      // Decode base64 data back to buffer
      const buffer = Buffer.from(data, 'base64');
      
      console.log(`🌉 Bridge received ${buffer.length} bytes from local hardware at ${new Date().toISOString()}`);
      
      // Store bridge activity for monitoring
      if (!global.bridgeStats) {
        global.bridgeStats = {
          totalMessages: 0,
          totalBytes: 0,
          lastReceived: null,
          isActive: false
        };
      }
      
      global.bridgeStats.totalMessages++;
      global.bridgeStats.totalBytes += buffer.length;
      global.bridgeStats.lastReceived = new Date();
      global.bridgeStats.isActive = true;
      
      // Process the MAVLink data through the service
      // This will parse messages and create drone records in the database
      try {
        await mavlinkService.processBridgeData(buffer);
      } catch (error) {
        console.error('Failed to process bridge data through MAVLink service:', error);
      }
      
      res.json({ 
        status: 'ok', 
        received: buffer.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Bridge API error:', error);
      res.status(500).json({ error: 'Failed to process bridge data' });
    }
  });

  // Meshtastic bridge endpoint
  app.post('/api/bridge/meshtastic', async (req, res) => {
    try {
      // Store bridge activity for monitoring
      if (!global.meshtasticBridgeStats) {
        global.meshtasticBridgeStats = {
          totalMessages: 0,
          totalBytes: 0,
          lastReceived: null,
          isActive: false
        };
      }
      
      global.meshtasticBridgeStats.totalMessages++;
      global.meshtasticBridgeStats.lastReceived = new Date();
      global.meshtasticBridgeStats.isActive = true;
      
      let rawData;
      let parsedData = null;
      
      // Handle enhanced bridge data format
      if (req.headers['x-bridge-type'] === 'meshtastic-enhanced' && req.body.raw && req.body.parsed) {
        rawData = Buffer.from(req.body.raw.data || req.body.raw);
        parsedData = req.body.parsed;
        global.meshtasticBridgeStats.totalBytes += rawData.length;
        
        console.log(`📡 Enhanced Meshtastic data: ${parsedData?.type} from ${parsedData?.from} (${rawData.length} bytes)`);
        
        // Process enhanced parsed data
        if (parsedData) {
          await meshtasticService.processEnhancedBridgeData(rawData, parsedData);
        }
      } else {
        // Handle legacy raw data format
        rawData = req.body as Buffer;
        global.meshtasticBridgeStats.totalBytes += rawData.length;
        console.log(`📡 Raw Meshtastic data: ${rawData.length} bytes from local hardware`);
        
        await meshtasticService.processBridgeData(rawData);
      }
      
      res.json({ 
        status: 'ok', 
        received: rawData.length, 
        parsed: !!parsedData,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Meshtastic bridge API error:', error);
      res.status(500).json({ error: 'Failed to process Meshtastic bridge data' });
    }
  });

  // Bridge status endpoint
  app.get('/api/bridge/status', (req, res) => {
    const mavlinkStats = global.bridgeStats || {
      totalMessages: 0,
      totalBytes: 0,
      lastReceived: null,
      isActive: false
    };
    
    const meshtasticStats = global.meshtasticBridgeStats || {
      totalMessages: 0,
      totalBytes: 0,
      lastReceived: null,
      isActive: false
    };
    
    // Check if bridges are active (received data in last 10 seconds)
    const now = new Date();
    const mavlinkActive = mavlinkStats.lastReceived && 
      (now.getTime() - mavlinkStats.lastReceived.getTime()) < 10000;
    const meshtasticActive = meshtasticStats.lastReceived && 
      (now.getTime() - meshtasticStats.lastReceived.getTime()) < 10000;
    
    res.json({
      mavlink: {
        ...mavlinkStats,
        isActive: mavlinkActive,
        formattedBytes: formatBytes(mavlinkStats.totalBytes),
        secondsSinceLastMessage: mavlinkStats.lastReceived ? 
          Math.floor((now.getTime() - mavlinkStats.lastReceived.getTime()) / 1000) : null
      },
      meshtastic: {
        ...meshtasticStats,
        isActive: meshtasticActive,
        formattedBytes: formatBytes(meshtasticStats.totalBytes),
        secondsSinceLastMessage: meshtasticStats.lastReceived ? 
          Math.floor((now.getTime() - meshtasticStats.lastReceived.getTime()) / 1000) : null
      }
    });
  });

  // NodeDB routes
  app.get('/api/nodedb/:nodeId', isAuthenticated, async (req, res) => {
    try {
      const { nodeId } = req.params;
      const records = await storage.getNodeDbRecords(nodeId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching NodeDB records:", error);
      res.status(500).json({ message: "Failed to fetch NodeDB records" });
    }
  });

  app.post('/api/nodedb/read', isAuthenticated, async (req, res) => {
    try {
      console.log('NodeDB read request received:', req.body);
      const { nodeId, dataType, rawData, parsedData, dataSize, recordCount } = req.body;
      
      if (!nodeId || !dataType || !rawData) {
        console.log('Missing required fields:', { nodeId: !!nodeId, dataType: !!dataType, rawData: !!rawData });
        return res.status(400).json({ message: "Missing required fields: nodeId, dataType, rawData" });
      }

      console.log('Attempting to insert NodeDB record for node:', nodeId);
      const record = await storage.insertNodeDbRecord({
        nodeId,
        dataType,
        rawData,
        parsedData,
        dataSize,
        recordCount
      });

      console.log('NodeDB record inserted successfully:', record.id);
      res.json(record);
    } catch (error) {
      console.error("Error storing NodeDB record:", error);
      res.status(500).json({ message: "Failed to store NodeDB record" });
    }
  });

  // Test endpoint without authentication for debugging
  app.post('/api/test/nodedb', async (req, res) => {
    try {
      console.log('Test NodeDB endpoint called:', req.body);
      const testData = {
        nodeId: 'test_node_123',
        dataType: 'complete_db',
        rawData: { test: 'data', timestamp: new Date().toISOString() },
        parsedData: { parsed: 'test', count: 1 },
        dataSize: 50,
        recordCount: 1
      };
      
      const record = await storage.insertNodeDbRecord(testData);
      console.log('Test NodeDB record created:', record.id);
      res.json({ success: true, record });
    } catch (error) {
      console.error('Test NodeDB error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/nodedb/:nodeId/latest', isAuthenticated, async (req, res) => {
    try {
      const { nodeId } = req.params;
      const record = await storage.getLatestNodeDbRecord(nodeId);
      res.json(record || null);
    } catch (error) {
      console.error("Error fetching latest NodeDB record:", error);
      res.status(500).json({ message: "Failed to fetch latest NodeDB record" });
    }
  });

  // Setup WebSocket server
  setupWebSocket(httpServer);
  
  // Initialize services
  await meshtasticService.initialize();
  await mavlinkService.initialize();

  return httpServer;
}
