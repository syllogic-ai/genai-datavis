ALTER TABLE "llm_usage" RENAME COLUMN "equipment" TO "provider";--> statement-breakpoint
ALTER TABLE "llm_usage" DROP CONSTRAINT "llm_usage_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "request_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage" DROP COLUMN IF EXISTS "user_id";