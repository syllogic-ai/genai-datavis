import { pgTable, foreignKey, unique, text, jsonb, timestamp, boolean, integer, index, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const userPreferences = pgTable("user_preferences", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	chartDefaults: jsonb("chart_defaults").default({"showGrid":true,"animation":true,"showLegend":true}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_preferences_user_id_users_id_fk"
		}),
	unique("user_preferences_user_id_unique").on(table.userId),
]);

export const themes = pgTable("themes", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	styles: jsonb().notNull(),
	presetId: text("preset_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	userId: text("user_id").notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "themes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

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
});

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
			name: "files_dashboard_id_dashboards_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_users_id_fk"
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
	layout: jsonb(),
	chatId: text("chat_id"),
	isConfigured: boolean("is_configured").default(false),
	cacheKey: text("cache_key"),
	lastDataFetch: timestamp("last_data_fetch", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	order: integer(),
	layoutId: text("layout_id"),
	columnIndex: integer("column_index"),
	orderInColumn: integer("order_in_column"),
}, (table) => [
	index("idx_widgets_layout_id").using("btree", table.layoutId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "widgets_chat_id_chats_id_fk"
		}),
	foreignKey({
			columns: [table.dashboardId],
			foreignColumns: [dashboards.id],
			name: "widgets_dashboard_id_dashboards_id_fk"
		}).onDelete("cascade"),
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
	isPublic: boolean("is_public").default(false).notNull(),
	activeThemeId: text("active_theme_id"),
}, (table) => [
	foreignKey({
			columns: [table.activeThemeId],
			foreignColumns: [themes.id],
			name: "dashboards_active_theme_id_themes_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "dashboards_user_id_users_id_fk"
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
			name: "chats_dashboard_id_dashboards_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chats_user_id_users_id_fk"
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
});
