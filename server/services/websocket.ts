import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { meshtasticService } from './meshtastic';
import { mavlinkService } from './mavlink';
import { storage } from '../storage';

interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (info) => {
        // In a real implementation, verify authentication here
        return true;
      }
    });

    this.wss.on('connection', (ws: WebSocketClient, request) => {
      console.log('WebSocket client connected');
      
      ws.isAlive = true;
      this.clients.add(ws);

      // Handle authentication
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial data
      this.sendInitialData(ws);
    });

    // Setup ping/pong for connection health
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    // Listen to service events
    this.setupServiceListeners();

    console.log('WebSocket server initialized');
  }

  private async handleMessage(ws: WebSocketClient, message: any) {
    switch (message.type) {
      case 'auth':
        // In a real implementation, verify the token
        ws.userId = message.userId;
        this.broadcast({ type: 'auth', status: 'success' }, ws);
        break;

      case 'subscribe':
        // Handle subscription to specific data streams
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          channel: message.channel 
        }));
        break;

      case 'sendMessage':
        if (message.toNodeId && message.content) {
          try {
            await meshtasticService.sendMessage(message.toNodeId, message.content);
            ws.send(JSON.stringify({ 
              type: 'messageSent', 
              success: true 
            }));
          } catch (error) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to send message' 
            }));
          }
        }
        break;

      case 'droneCommand':
        if (message.droneId && message.command) {
          try {
            await mavlinkService.sendCommand(
              message.droneId, 
              message.command, 
              message.parameters
            );
            ws.send(JSON.stringify({ 
              type: 'commandSent', 
              success: true 
            }));
          } catch (error) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to send drone command' 
            }));
          }
        }
        break;

      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Unknown message type' 
        }));
    }
  }

  private async sendInitialData(ws: WebSocketClient) {
    try {
      // Send current node status
      const nodes = await storage.getAllNodes();
      ws.send(JSON.stringify({ 
        type: 'nodes', 
        data: nodes 
      }));

      // Send current drone status
      const drones = await storage.getAllDrones();
      ws.send(JSON.stringify({ 
        type: 'drones', 
        data: drones 
      }));

      // Send recent messages
      const messages = await storage.getRecentMessages(20);
      ws.send(JSON.stringify({ 
        type: 'messages', 
        data: messages 
      }));

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private setupServiceListeners() {
    // Meshtastic service events
    meshtasticService.on('packetReceived', (packet) => {
      this.broadcast({ 
        type: 'meshtasticPacket', 
        data: packet 
      });
    });

    meshtasticService.on('messageReceived', (message) => {
      this.broadcast({ 
        type: 'newMessage', 
        data: message 
      });
    });

    meshtasticService.on('positionUpdate', (update) => {
      this.broadcast({ 
        type: 'nodePositionUpdate', 
        data: update 
      });
    });

    meshtasticService.on('telemetryUpdate', (update) => {
      this.broadcast({ 
        type: 'nodeTelemetryUpdate', 
        data: update 
      });
    });

    // MAVLink service events
    mavlinkService.on('heartbeat', (data) => {
      this.broadcast({ 
        type: 'droneHeartbeat', 
        data 
      });
    });

    mavlinkService.on('positionUpdate', (data) => {
      this.broadcast({ 
        type: 'dronePositionUpdate', 
        data 
      });
    });

    mavlinkService.on('batteryUpdate', (data) => {
      this.broadcast({ 
        type: 'droneBatteryUpdate', 
        data 
      });
    });

    mavlinkService.on('commandResult', (data) => {
      this.broadcast({ 
        type: 'droneCommandResult', 
        data 
      });
    });
  }

  private broadcast(message: any, except?: WebSocketClient) {
    const data = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client !== except && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public sendToUser(userId: string, message: any) {
    const data = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((client) => {
      client.terminate();
    });
    
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('WebSocket server closed');
  }
}

const webSocketService = new WebSocketService();

export function setupWebSocket(server: Server) {
  webSocketService.initialize(server);
}

export { webSocketService };
