import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  jsonb, 
  index,
  serial,
  integer,
  real,
  boolean,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "user", "watcher"] }).default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meshtastic Nodes
export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  nodeId: varchar("node_id").notNull().unique(),
  name: varchar("name").notNull(),
  shortName: varchar("short_name"),
  hwModel: varchar("hw_model"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  altitude: real("altitude"),
  rssi: integer("rssi"),
  snr: real("snr"),
  batteryLevel: real("battery_level"),
  voltage: real("voltage"),
  lastSeen: timestamp("last_seen"),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromNodeId: varchar("from_node_id").references(() => nodes.nodeId),
  toNodeId: varchar("to_node_id").references(() => nodes.nodeId),
  content: text("content").notNull(),
  messageType: varchar("message_type", { enum: ["text", "position", "telemetry", "admin"] }).default("text"),
  timestamp: timestamp("timestamp").defaultNow(),
  acknowledged: boolean("acknowledged").default(false),
});

// Drones
export const drones = pgTable("drones", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  serialNumber: varchar("serial_number").unique(),
  model: varchar("model"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  altitude: real("altitude"),
  altitudeRelative: real("altitude_relative"),
  groundSpeed: real("ground_speed"),
  airSpeed: real("air_speed"),
  heading: real("heading"),
  batteryLevel: real("battery_level"),
  voltage: real("voltage"),
  current: real("current"),
  roll: real("roll"),
  pitch: real("pitch"),
  yaw: real("yaw"),
  flightMode: varchar("flight_mode"),
  armed: boolean("armed").default(false),
  gpsFixType: integer("gps_fix_type"),
  satelliteCount: integer("satellite_count"),
  lastTelemetry: timestamp("last_telemetry"),
  isConnected: boolean("is_connected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mission Plans
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  droneId: integer("drone_id").references(() => drones.id),
  status: varchar("status", { enum: ["planned", "active", "completed", "aborted"] }).default("planned"),
  waypoints: jsonb("waypoints"),
  parameters: jsonb("parameters"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shared Maps
export const sharedMaps = pgTable("shared_maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  viewerSettings: jsonb("viewer_settings"),
  expiresAt: timestamp("expires_at"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category").notNull().default("general"),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  missions: many(missions),
  sharedMaps: many(sharedMaps),
}));

export const nodesRelations = relations(nodes, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromNode: one(nodes, {
    fields: [messages.fromNodeId],
    references: [nodes.nodeId],
    relationName: "sentMessages",
  }),
  toNode: one(nodes, {
    fields: [messages.toNodeId],
    references: [nodes.nodeId],
    relationName: "receivedMessages",
  }),
}));

export const dronesRelations = relations(drones, ({ many }) => ({
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one }) => ({
  creator: one(users, {
    fields: [missions.createdBy],
    references: [users.id],
  }),
  drone: one(drones, {
    fields: [missions.droneId],
    references: [drones.id],
  }),
}));

export const sharedMapsRelations = relations(sharedMaps, ({ one }) => ({
  creator: one(users, {
    fields: [sharedMaps.createdBy],
    references: [users.id],
  }),
}));

// Schema Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertNodeSchema = createInsertSchema(nodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const insertDroneSchema = createInsertSchema(drones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDrone = z.infer<typeof insertDroneSchema>;
export type Drone = typeof drones.$inferSelect;

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

export const insertSharedMapSchema = createInsertSchema(sharedMaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedMap = z.infer<typeof insertSharedMapSchema>;
export type SharedMap = typeof sharedMaps.$inferSelect;

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
