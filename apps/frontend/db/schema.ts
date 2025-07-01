import { pgTable, text, timestamp, jsonb, integer, real, boolean } from "drizzle-orm/pg-core";

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
  dashboardId: text("dashboard_id").references(() => dashboards.id, { onDelete: "cascade" }), // Link files to dashboard
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
  name: text("name").notNull().default("New Dashboard"),
  description: text("description"),
  icon: text("icon").default("document-text").notNull(),
  
  // Removed single file reference - now files reference dashboards instead
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WIDGETS (updated to match frontend structure)
export const widgets = pgTable("widgets", {
  id: text("id").primaryKey(),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  
  // Widget title
  title: text("title").notNull(),

  // Widget type from frontend: 'text' | 'chart' | 'kpi' | 'table'
  type: text("type").notNull(),
  
  // Widget configuration (all widget-specific settings)
  config: jsonb("config").notNull().$type<Record<string, any>>(),
  
  // Widget data (chart data, table data, etc.)
  data: jsonb("data").$type<any>(),
  
  // SQL query for the dashboard
  sql: text("sql"),

  // React Grid Layout position
  layout: jsonb("layout").notNull().$type<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    isResizable?: boolean;
  }>(),
  
  // Optional fields for enhanced functionality
  chatId: text("chat_id").references(() => chats.id), // If widget was created from chat
  isConfigured: boolean("is_configured").default(false),
  
  // Cache-related fields
  cacheKey: text("cache_key"),
  lastDataFetch: timestamp("last_data_fetch"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CHATS (linked to dashboards for unified context)
export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }), // Chat context per dashboard
  title: text("title").notNull().default("Dashboard Chat"),
  conversation: jsonb("conversation").notNull().$type<{
    role: string;
    message: string;
    timestamp: string;
    contextWidgetIds?: string[]; // Widgets included as context for this message
    targetWidgetType?: 'chart' | 'table' | 'kpi'; // Target widget type for creation
    targetChartSubType?: 'line' | 'area' | 'bar' | 'horizontal-bar' | 'pie'; // Chart sub-type if applicable
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