import {
  users,
  nodes,
  messages,
  drones,
  missions,
  sharedMaps,
  settings,
  nodeDb,
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
  type Setting,
  type InsertSetting,
  type NodeDb,
  type InsertNodeDb,
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

  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  getSettingsByCategory(category: string): Promise<Setting[]>;

  // NodeDB operations
  getNodeDbRecords(nodeId: string): Promise<NodeDb[]>;
  getNodeDbRecord(nodeId: string, dataType: string): Promise<NodeDb | undefined>;
  insertNodeDbRecord(record: InsertNodeDb): Promise<NodeDb>;
  getLatestNodeDbRecord(nodeId: string): Promise<NodeDb | undefined>;
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
    return [];
  }

  async getNode(nodeId: string): Promise<Node | undefined> {
    return undefined;
  }

  async upsertNode(nodeData: InsertNode): Promise<Node> {
    throw new Error("Node operations not available - use Web Serial API for direct connection");
  }

  async updateNodeStatus(nodeId: string, isOnline: boolean, lastSeen: Date): Promise<void> {
    // No-op - Web Serial API handles connection status
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

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(settingData: InsertSetting): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({
        ...settingData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: settingData.value,
          updatedBy: settingData.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    return await db
      .select()
      .from(settings)
      .where(eq(settings.category, category))
      .orderBy(settings.key);
  }

  // NodeDB operations
  async getNodeDbRecords(nodeId: string): Promise<NodeDb[]> {
    return await db
      .select()
      .from(nodeDb)
      .where(eq(nodeDb.nodeId, nodeId))
      .orderBy(desc(nodeDb.readAt));
  }

  async getNodeDbRecord(nodeId: string, dataType: string): Promise<NodeDb | undefined> {
    const [record] = await db
      .select()
      .from(nodeDb)
      .where(and(eq(nodeDb.nodeId, nodeId), eq(nodeDb.dataType, dataType)))
      .orderBy(desc(nodeDb.readAt))
      .limit(1);
    return record;
  }

  async insertNodeDbRecord(recordData: InsertNodeDb): Promise<NodeDb> {
    console.log('Attempting to insert NodeDB record:', recordData);
    try {
      const [record] = await db
        .insert(nodeDb)
        .values(recordData)
        .returning();
      console.log('NodeDB record inserted successfully:', record);
      return record;
    } catch (error) {
      console.error('Database insertion error:', error);
      throw error;
    }
  }

  async getLatestNodeDbRecord(nodeId: string): Promise<NodeDb | undefined> {
    const [record] = await db
      .select()
      .from(nodeDb)
      .where(eq(nodeDb.nodeId, nodeId))
      .orderBy(desc(nodeDb.readAt))
      .limit(1);
    return record;
  }
}

export const storage = new DatabaseStorage();
