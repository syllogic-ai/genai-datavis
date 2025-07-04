ALTER TABLE "jobs" DROP CONSTRAINT "jobs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_usage" DROP CONSTRAINT "llm_usage_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "size" integer;