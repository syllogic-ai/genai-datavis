ALTER TABLE "jobs" DROP CONSTRAINT "jobs_dashboard_id_dashboards_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_usage" DROP CONSTRAINT "llm_usage_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "dashboard_id" text;