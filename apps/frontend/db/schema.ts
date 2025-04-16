import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

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
  usage: jsonb("usage").$type<{
    provider: "openai" | "huggingface";
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    costUSD: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CHARTS
export const charts = pgTable("charts", {
  id: text("id").primaryKey(), // Can be any string ID
  chatId: text("chat_id").references(() => chats.id),
  chartType: text("chart_type").notNull(),
  chartSpecs: jsonb("chart_specs").notNull(), // Next.js-compatible chart config
  createdAt: timestamp("created_at").defaultNow(),
});

// Define Chat type
export type User = typeof users.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type File = typeof files.$inferSelect;
export type Chart = typeof charts.$inferSelect;
