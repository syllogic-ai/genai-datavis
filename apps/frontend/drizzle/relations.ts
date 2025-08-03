import { relations } from "drizzle-orm/relations";
import { users, userPreferences, themes, dashboards, files, chats, widgets } from "./schema";

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(users, {
		fields: [userPreferences.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userPreferences: many(userPreferences),
	themes: many(themes),
	files: many(files),
	dashboards: many(dashboards),
	chats: many(chats),
}));

export const themesRelations = relations(themes, ({one, many}) => ({
	user: one(users, {
		fields: [themes.userId],
		references: [users.id]
	}),
	dashboards: many(dashboards),
}));

export const filesRelations = relations(files, ({one}) => ({
	dashboard: one(dashboards, {
		fields: [files.dashboardId],
		references: [dashboards.id]
	}),
	user: one(users, {
		fields: [files.userId],
		references: [users.id]
	}),
}));

export const dashboardsRelations = relations(dashboards, ({one, many}) => ({
	files: many(files),
	widgets: many(widgets),
	theme: one(themes, {
		fields: [dashboards.activeThemeId],
		references: [themes.id]
	}),
	user: one(users, {
		fields: [dashboards.userId],
		references: [users.id]
	}),
	chats: many(chats),
}));

export const widgetsRelations = relations(widgets, ({one}) => ({
	chat: one(chats, {
		fields: [widgets.chatId],
		references: [chats.id]
	}),
	dashboard: one(dashboards, {
		fields: [widgets.dashboardId],
		references: [dashboards.id]
	}),
}));

export const chatsRelations = relations(chats, ({one, many}) => ({
	widgets: many(widgets),
	dashboard: one(dashboards, {
		fields: [chats.dashboardId],
		references: [dashboards.id]
	}),
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
}));