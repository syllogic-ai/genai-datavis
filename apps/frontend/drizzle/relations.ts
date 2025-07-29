import { relations } from "drizzle-orm/relations";
import { dashboards, files, users, chats, widgets, themes } from "../db/schema";

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
	user: one(users, {
		fields: [dashboards.userId],
		references: [users.id]
	}),
	chats: many(chats),
	widgets: many(widgets),
	activeTheme: one(themes, {
		fields: [dashboards.activeThemeId],
		references: [themes.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	files: many(files),
	dashboards: many(dashboards),
	chats: many(chats),
	themes: many(themes),
}));

export const chatsRelations = relations(chats, ({one, many}) => ({
	dashboard: one(dashboards, {
		fields: [chats.dashboardId],
		references: [dashboards.id]
	}),
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
	widgets: many(widgets),
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

export const themesRelations = relations(themes, ({one, many}) => ({
	user: one(users, {
		fields: [themes.userId],
		references: [users.id]
	}),
	activeDashboards: many(dashboards),
}));