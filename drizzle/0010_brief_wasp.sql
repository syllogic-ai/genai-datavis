ALTER TABLE "jobs" DROP CONSTRAINT "jobs_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_dashboard_id_dashboards_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "chat_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "request_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "message";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "context_widget_ids";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "target_widget_type";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "result";