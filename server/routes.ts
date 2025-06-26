import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupWebSocket } from "./services/websocket";
import { meshtasticService } from "./services/meshtastic";
import { mavlinkService } from "./services/mavlink";
import { insertNodeSchema, insertMessageSchema, insertDroneSchema, insertMissionSchema, insertSharedMapSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer);
  
  // Initialize services
  await meshtasticService.initialize();
  await mavlinkService.initialize();

  return httpServer;
}
