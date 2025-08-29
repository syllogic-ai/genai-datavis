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
  
  // Public sharing
  isPublic: boolean("is_public").default(false).notNull(),
  
  // Theme assignment - each dashboard can have one active theme
  activeThemeId: text("active_theme_id").references(() => themes.id, { onDelete: "set null" }),
  themeMode: text("theme_mode").default("light").notNull(), // 'light' | 'dark' | 'system'
  
  // Dashboard layout settings
  width: text("width").default("full").notNull(), // 'full' | 'constrained'
  
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

  // Summary
  summary: text("summary"),
  
  // Widget configuration (all widget-specific settings)
  config: jsonb("config").notNull().$type<Record<string, any>>(),
  
  // Widget data (chart data, table data, etc.)
  data: jsonb("data").$type<any>(),
  
  // SQL query for the dashboard
  sql: text("sql"),

  // React Grid Layout position (legacy - keep for backward compatibility)
  layout: jsonb("layout").$type<{
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

  // Simple order-based positioning (new system - optional for transition)
  order: integer("order"),
  
  // Optional fields for enhanced functionality
  chatId: text("chat_id").references(() => chats.id), // If widget was created from chat
  isConfigured: boolean("is_configured").default(false),
  
  // Cache-related fields
  cacheKey: text("cache_key"),
  lastDataFetch: timestamp("last_data_fetch"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CHATS (simplified - conversation moved to separate messages table)
export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }), // Chat context per dashboard
  title: text("title").notNull().default("Dashboard Chat"),
  
  // Chat metadata
  lastMessageAt: timestamp("last_message_at"),
  messageCount: integer("message_count").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MESSAGES (new table for individual chat messages)
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  
  // Core message properties
  role: text("role").notNull(), // 'user' | 'system' | 'ai'
  content: text("content"),
  
  // Message categorization
  messageType: text("message_type"), // 'chat' | 'task-list' | 'tool-usage'
  
  // Task grouping (for messages that create/manage tasks)
  taskGroupId: text("task_group_id"), // Links message to a group of related tasks
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TASKS (new table for tracking job tasks and progress)
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  
  // Task grouping - multiple tasks can belong to same group (same AI response)
  taskGroupId: text("task_group_id").notNull(),
  
  // Task details
  title: text("title").notNull(), // "Fetch data", "Generate code", etc.
  description: text("description"), // Optional detailed description
  status: text("status").default("pending").notNull(), // 'pending' | 'in-progress' | 'completed' | 'failed'
  order: integer("order").notNull(), // Display order within the group
  
  // Execution tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LLM USAGE (simplified)
export const llmUsage = pgTable('llm_usage', {
  id: text("id").primaryKey(),
  userId: text("user_id"), // Store as text, no foreign key for analytics preservation
  chatId: text("chat_id"), // Store as text, no foreign key for analytics preservation
  requestId: text("request_id"),
  dashboardId: text("dashboard_id"), // Store dashboard_id for analytics
  
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalCost: real('total_cost').notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});


// THEMES (global theme system - can be shared across dashboards)
export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(), // Mark if this is a default/built-in theme
  
  // Complete theme styles for light/dark modes
  styles: jsonb("styles").$type<{
    light: ThemeStyleProps;
    dark: ThemeStyleProps;
  }>().notNull(),
  
  // Optional reference to built-in preset
  presetId: text("preset_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Theme style properties interface
export interface ThemeStyleProps {
  // Chart colors (OKLCH format)
  "chart-1": string;  // e.g., "oklch(0.81 0.10 252)"
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  "chart-positive": string; // e.g., "oklch(0.5682 0.167 135.46)"
  "chart-negative": string; // e.g., "oklch(0.4149 0.1695 28.96)"
  [key: `chart-${number}`]: string; // Allow additional chart colors
  
  // Font configuration
  "font-sans": string;  // e.g., "Inter, sans-serif"
  "font-serif": string; // e.g., "Merriweather, serif"
  "font-mono": string;  // e.g., "JetBrains Mono, monospace"
  "font-size-base": string; // e.g., "16px"
  "font-size-sm": string;   // e.g., "14px"
  "font-size-lg": string;   // e.g., "18px"
  
  // UI colors
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary?: string;
  "secondary-foreground"?: string;
  muted?: string;
  "muted-foreground"?: string;
  accent?: string;
  "accent-foreground"?: string;
  destructive?: string;
  "destructive-foreground"?: string;
  border?: string;
  input?: string;
  ring?: string;
  
  // Additional styling
  radius: string;
  spacing: string;
  
  // Shadow properties
  "shadow-color"?: string;
  "shadow-opacity"?: string;
  "shadow-blur"?: string;
  "shadow-spread"?: string;
  "shadow-offset-x"?: string;
  "shadow-offset-y"?: string;
  
  // Chart display options
  "show-grid-lines"?: string; // "true" | "false" - stored as string for consistency
  
  // Other properties
  "letter-spacing"?: string;
}

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
export type Message = typeof messages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type LLMUsage = typeof llmUsage.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;