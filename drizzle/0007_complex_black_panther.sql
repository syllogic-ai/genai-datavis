ALTER TABLE "dashboard_widgets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dashboards" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "widgets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dashboard_widgets" CASCADE;--> statement-breakpoint
DROP TABLE "dashboards" CASCADE;--> statement-breakpoint
DROP TABLE "widgets" CASCADE;--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_dashboard_id_dashboards_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "widget_id";--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "dashboard_id";