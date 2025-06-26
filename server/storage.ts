import {
  users,
  nodes,
  messages,
  drones,
  missions,
  sharedMaps,
  type User,
  type UpsertUser,
  type Node,
  type InsertNode,
  type Message,
  type InsertMessage,
  type Drone,
  type InsertDrone,
  type Mission,
  type InsertMission,
  type SharedMap,
  type InsertSharedMap,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Node operations
  getAllNodes(): Promise<Node[]>;
  getNode(nodeId: string): Promise<Node | undefined>;
  upsertNode(node: InsertNode): Promise<Node>;
  updateNodeStatus(nodeId: string, isOnline: boolean, lastSeen: Date): Promise<void>;

  // Message operations
  getRecentMessages(limit?: number): Promise<Message[]>;
  insertMessage(message: InsertMessage): Promise<Message>;
  getMessageHistory(fromNode?: string, toNode?: string): Promise<Message[]>;

  // Drone operations
  getAllDrones(): Promise<Drone[]>;
  getDrone(id: number): Promise<Drone | undefined>;
  upsertDrone(drone: InsertDrone): Promise<Drone>;
  updateDroneTelemetry(id: number, telemetry: Partial<Drone>): Promise<void>;

  // Mission operations
  getMissions(userId?: string): Promise<Mission[]>;
  getMission(id: number): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMissionStatus(id: number, status: string): Promise<void>;

  // Shared map operations
  getSharedMap(id: string): Promise<SharedMap | undefined>;
  createSharedMap(map: InsertSharedMap): Promise<SharedMap>;
  getPublicSharedMaps(): Promise<SharedMap[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Node operations
  async getAllNodes(): Promise<Node[]> {
    return await db.select().from(nodes).orderBy(desc(nodes.lastSeen));
  }

  async getNode(nodeId: string): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.nodeId, nodeId));
    return node;
  }

  async upsertNode(nodeData: InsertNode): Promise<Node> {
    const [node] = await db
      .insert(nodes)
      .values({ ...nodeData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: nodes.nodeId,
        set: {
          ...nodeData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return node;
  }

  async updateNodeStatus(nodeId: string, isOnline: boolean, lastSeen: Date): Promise<void> {
    await db
      .update(nodes)
      .set({ isOnline, lastSeen, updatedAt: new Date() })
      .where(eq(nodes.nodeId, nodeId));
  }

  // Message operations
  async getRecentMessages(limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  async insertMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getMessageHistory(fromNode?: string, toNode?: string): Promise<Message[]> {
    let query = db.select().from(messages);
    
    if (fromNode && toNode) {
      query = query.where(
        and(
          eq(messages.fromNodeId, fromNode),
          eq(messages.toNodeId, toNode)
        )
      );
    } else if (fromNode) {
      query = query.where(eq(messages.fromNodeId, fromNode));
    } else if (toNode) {
      query = query.where(eq(messages.toNodeId, toNode));
    }

    return await query.orderBy(desc(messages.timestamp));
  }

  // Drone operations
  async getAllDrones(): Promise<Drone[]> {
    return await db.select().from(drones).orderBy(desc(drones.lastTelemetry));
  }

  async getDrone(id: number): Promise<Drone | undefined> {
    const [drone] = await db.select().from(drones).where(eq(drones.id, id));
    return drone;
  }

  async upsertDrone(droneData: InsertDrone): Promise<Drone> {
    const [drone] = await db
      .insert(drones)
      .values({ ...droneData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: drones.serialNumber,
        set: {
          ...droneData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return drone;
  }

  async updateDroneTelemetry(id: number, telemetry: Partial<Drone>): Promise<void> {
    await db
      .update(drones)
      .set({ ...telemetry, lastTelemetry: new Date(), updatedAt: new Date() })
      .where(eq(drones.id, id));
  }

  // Mission operations
  async getMissions(userId?: string): Promise<Mission[]> {
    let query = db.select().from(missions);
    
    if (userId) {
      query = query.where(eq(missions.createdBy, userId));
    }

    return await query.orderBy(desc(missions.createdAt));
  }

  async getMission(id: number): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions).where(eq(missions.id, id));
    return mission;
  }

  async createMission(missionData: InsertMission): Promise<Mission> {
    const [mission] = await db
      .insert(missions)
      .values(missionData)
      .returning();
    return mission;
  }

  async updateMissionStatus(id: number, status: string): Promise<void> {
    await db
      .update(missions)
      .set({ status, updatedAt: new Date() })
      .where(eq(missions.id, id));
  }

  // Shared map operations
  async getSharedMap(id: string): Promise<SharedMap | undefined> {
    const [map] = await db.select().from(sharedMaps).where(eq(sharedMaps.id, id));
    return map;
  }

  async createSharedMap(mapData: InsertSharedMap): Promise<SharedMap> {
    const [map] = await db
      .insert(sharedMaps)
      .values(mapData)
      .returning();
    return map;
  }

  async getPublicSharedMaps(): Promise<SharedMap[]> {
    return await db
      .select()
      .from(sharedMaps)
      .where(
        and(
          eq(sharedMaps.isPublic, true),
          gte(sharedMaps.expiresAt, new Date())
        )
      )
      .orderBy(desc(sharedMaps.createdAt));
  }
}

export const storage = new DatabaseStorage();
