import { pgTable, text, timestamp, jsonb, integer, real } from "drizzle-orm/pg-core";

// USERS (unchanged)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// FILES (simplified - user-scoped)
export const files = pgTable("files", {
  id: text("id").primaryKey(), // Can be any string ID
  userId: text("user_id").notNull().references(() => users.id),
  fileType: text("file_type").notNull(), // 'original' | 'cleaned' | 'meta'
  originalFilename: text("original_filename"),
  storagePath: text("storage_path").notNull(),
  status: text("status").default("ready"), // 'processing' | 'ready' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// DASHBOARDS (simplified - user-scoped for MVP)
export const dashboards = pgTable("dashboards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  
  // Single file per dashboard for MVP simplicity
  fileId: text("file_id").references(() => files.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WIDGETS (simplified)
export const widgets = pgTable("widgets", {
  id: text("id").primaryKey(),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  chartType: text("chart_type"), // 'bar' | 'line' | 'pie' | 'table'
  chartSpecs: jsonb("chart_specs"), // Chart configuration
  sql: text("sql"), // Generated SQL query
  
  // Simple grid position
  position: jsonb("position").$type<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// CHATS (simplified - linked to files for context)
export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  fileId: text("file_id").references(() => files.id), // Chat context
  title: text("title").notNull().default("New Chat"),
  conversation: jsonb("conversation").notNull().$type<{
    role: string;
    message: string;
    timestamp: string;
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LLM USAGE (simplified)
export const llmUsage = pgTable('llm_usage', {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  chatId: text("chat_id").references(() => chats.id),
  
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalCost: real('total_cost').notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type Dashboard = typeof dashboards.$inferSelect;
export type Widget = typeof widgets.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type LLMUsage = typeof llmUsage.$inferSelect;