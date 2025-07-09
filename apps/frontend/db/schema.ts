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
  originalFilename: text("original_filename").notNull(), // User-visible filename
  sanitizedFilename: text("sanitized_filename"), // UUID-based filename for storage
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"), // MIME type for proper display
  size: integer("size"), // File size in bytes
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
  
  // Setup state tracking
  setupCompleted: boolean("setup_completed").default(false).notNull(),
  
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
  userId: text("user_id"), // Store as text, no foreign key for analytics preservation
  chatId: text("chat_id"), // Store as text, no foreign key for analytics preservation
  requestId: text("request_id"), // Same as job_id for linking to jobs
  dashboardId: text("dashboard_id"), // Store dashboard_id for analytics
  
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalCost: real('total_cost').notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// JOBS (for tracking async analysis tasks)
export const jobs = pgTable('jobs', {
  id: text("id").primaryKey(), // UUID job ID (same as Redis key)
  userId: text("user_id").notNull(), // Store as text, no foreign key for analytics preservation
  dashboardId: text("dashboard_id").notNull(), // Store as text, no foreign key for analytics preservation
  
  // Job metadata
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer("progress").default(0), // 0-100
  
  // Error tracking
  error: text("error"),
  
  // Timing information
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Performance metrics
  processingTimeMs: integer("processing_time_ms"),
  queueTimeMs: integer("queue_time_ms"),
});

// COLOR PALETTES (multiple palettes per user)
export const colorPalettes = pgTable("color_palettes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  
  // Chart colors in HSL format (matching CSS variables)
  chartColors: jsonb("chart_colors").$type<{
    "chart-1": string;  // e.g., "151.20 26.04% 37.65%"
    "chart-2": string;
    "chart-3": string;
    "chart-4": string;
    "chart-5": string;
    [key: string]: string; // Allow additional chart colors
  }>().notNull(),
  
  // Optional brand colors
  brandColors: jsonb("brand_colors").$type<{
    primary?: string;
    secondary?: string;
    accent?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// USER PREFERENCES (for non-theme settings)
export const userPreferences = pgTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  
  // Chart display preferences
  chartDefaults: jsonb("chart_defaults").$type<{
    showLegend: boolean;
    showGrid: boolean;
    animation: boolean;
  }>().default({
    showLegend: true,
    showGrid: true,
    animation: true
  }),
  
  // Other preferences can be added here
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type Dashboard = typeof dashboards.$inferSelect;
export type Widget = typeof widgets.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type LLMUsage = typeof llmUsage.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type ColorPalette = typeof colorPalettes.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;