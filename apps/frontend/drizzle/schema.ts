import { pgTable, foreignKey, text, jsonb, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const chats = pgTable("chats", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	fileId: text("file_id"),
	title: text().default('New Chat').notNull(),
	conversation: jsonb().notNull(),
	usage: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		chatsFileIdFilesIdFk: foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "chats_file_id_files_id_fk"
		}),
		chatsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chats_user_id_users_id_fk"
		}),
	}
});

export const charts = pgTable("charts", {
	id: text().primaryKey().notNull(),
	chatId: text("chat_id"),
	chartType: text("chart_type").notNull(),
	chartSpecs: jsonb("chart_specs").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		chartsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "charts_chat_id_chats_id_fk"
		}),
	}
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const files = pgTable("files", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fileType: text("file_type").notNull(),
	originalFilename: text("original_filename"),
	storagePath: text("storage_path").notNull(),
	status: text().default('ready'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		filesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_users_id_fk"
		}),
	}
});
