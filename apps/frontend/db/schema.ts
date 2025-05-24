import { pgTable, text, timestamp, jsonb, integer, real } from "drizzle-orm/pg-core";

// USERS
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// FILES
export const files = pgTable("files", {
  id: text("id").primaryKey(), // Can be any string ID
  userId: text("user_id").notNull().references(() => users.id),
  fileType: text("file_type").notNull(), // 'original' | 'cleaned' | 'meta'
  originalFilename: text("original_filename"),
  storagePath: text("storage_path").notNull(),
  status: text("status").default("ready"), // 'processing' | 'ready' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// CHATS
export const chats = pgTable("chats", {
  id: text("id").primaryKey(), // Can be any string ID
  userId: text("user_id").references(() => users.id),
  fileId: text("file_id").references(() => files.id),
  title: text("title").notNull().default("New Chat"),
  conversation: jsonb("conversation").notNull().$type<{
    role: string;
    message: string;
    timestamp: string;
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CHARTS
export const charts = pgTable("charts", {
  id: text("id").primaryKey(), // Can be any string ID
  chatId: text("chat_id").references(() => chats.id),
  chartType: text("chart_type"),
  chartSpecs: jsonb("chart_specs"), // Next.js-compatible chart config
  sql: text("sql"),
  createdAt: timestamp("created_at").defaultNow(),
});

// LLM USAGE
export const llmUsage = pgTable('llm_usage', {
  id: text("id").primaryKey(), // Can be any string ID
  requestId: text("request_id").notNull(), // the request id that was used e.g. "1234567890"
  chatId: text("chat_id").references(() => chats.id),
  model: text('model').notNull(), // the model that was used retrieved from MODEL_ID variable
  provider: text('provider').notNull(), // the provider that was used e.g. "OpenAI"
  api_request: text('api_request').notNull(), // the api request that was made e.g. "/analyze"
  inputTokens: integer('input_tokens').notNull(), // the number of input tokens used
  outputTokens: integer('output_tokens').notNull(), // the number of output tokens used
  computeTime: real('compute_time').notNull(),     // the time it took to compute the request
  totalCost: real('total_cost').notNull(),         // the total cost of the request
  createdAt: timestamp("created_at").defaultNow(),
});

// Define Chat type
export type User = typeof users.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type File = typeof files.$inferSelect;
export type Chart = typeof charts.$inferSelect;
export type LLMUsage = typeof llmUsage.$inferSelect;