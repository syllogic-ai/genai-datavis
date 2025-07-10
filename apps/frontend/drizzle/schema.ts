import { pgTable, index, pgPolicy, text, integer, timestamp, foreignKey, boolean, jsonb, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const jobs = pgTable("jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	dashboardId: text("dashboard_id").notNull(),
	status: text().default('pending').notNull(),
	progress: integer().default(0),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	processingTimeMs: integer("processing_time_ms"),
	queueTimeMs: integer("queue_time_ms"),
}, (table) => [
	index("idx_jobs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_jobs_dashboard_id").using("btree", table.dashboardId.asc().nullsLast().op("text_ops")),
	index("idx_jobs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_jobs_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("Anyone can read jobs", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const files = pgTable("files", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	dashboardId: text("dashboard_id"),
	fileType: text("file_type").notNull(),
	originalFilename: text("original_filename").notNull(),
	sanitizedFilename: text("sanitized_filename"),
	storagePath: text("storage_path").notNull(),
	status: text().default('ready'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	mimeType: text("mime_type"),
	size: integer(),
}, (table) => [
	foreignKey({
			columns: [table.dashboardId],
			foreignColumns: [dashboards.id],
			name: "files_dashboard_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_fkey"
		}),
]);

export const dashboards = pgTable("dashboards", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().default('New Dashboard').notNull(),
	description: text(),
	icon: text().default('document-text').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	setupCompleted: boolean("setup_completed").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "dashboards_user_id_fkey"
		}),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const chats = pgTable("chats", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	dashboardId: text("dashboard_id").notNull(),
	title: text().default('Dashboard Chat').notNull(),
	conversation: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.dashboardId],
			foreignColumns: [dashboards.id],
			name: "chats_dashboard_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chats_user_id_fkey"
		}),
]);

export const widgets = pgTable("widgets", {
	id: text().primaryKey().notNull(),
	dashboardId: text("dashboard_id").notNull(),
	title: text().notNull(),
	type: text().notNull(),
	config: jsonb().notNull(),
	data: jsonb(),
	sql: text(),
	layout: jsonb().notNull(),
	chatId: text("chat_id"),
	isConfigured: boolean("is_configured").default(false),
	cacheKey: text("cache_key"),
	lastDataFetch: timestamp("last_data_fetch", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "widgets_chat_id_fkey"
		}),
	foreignKey({
			columns: [table.dashboardId],
			foreignColumns: [dashboards.id],
			name: "widgets_dashboard_id_fkey"
		}).onDelete("cascade"),
]);

export const colorPalettes = pgTable("color_palettes", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	chartColors: jsonb("chart_colors").notNull(),
	brandColors: jsonb("brand_colors"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "color_palettes_user_id_users_id_fk"
		}),
]);

export const llmUsage = pgTable("llm_usage", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	chatId: text("chat_id"),
	model: text().notNull(),
	inputTokens: integer("input_tokens").notNull(),
	outputTokens: integer("output_tokens").notNull(),
	totalCost: real("total_cost").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	requestId: text("request_id"),
	dashboardId: text("dashboard_id"),
}, (table) => [
	index("idx_llm_usage_chat_id").using("btree", table.chatId.asc().nullsLast().op("text_ops")),
	index("idx_llm_usage_dashboard_id").using("btree", table.dashboardId.asc().nullsLast().op("text_ops")),
	index("idx_llm_usage_request_id").using("btree", table.requestId.asc().nullsLast().op("text_ops")),
]);
