import { relations } from "drizzle-orm/relations";
import { files, chats, users, charts } from "./schema";

export const chatsRelations = relations(chats, ({one, many}) => ({
	file: one(files, {
		fields: [chats.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
	charts: many(charts),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	chats: many(chats),
	user: one(users, {
		fields: [files.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	chats: many(chats),
	files: many(files),
}));

export const chartsRelations = relations(charts, ({one}) => ({
	chat: one(chats, {
		fields: [charts.chatId],
		references: [chats.id]
	}),
}));