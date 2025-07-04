-- Remove foreign key constraints
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_dashboard_id_dashboards_id_fk";
ALTER TABLE "llm_usage" DROP CONSTRAINT IF EXISTS "llm_usage_chat_id_chats_id_fk";

-- Add new columns to llm_usage for better analytics
ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "dashboard_id" text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_jobs_dashboard_id" ON "jobs" ("dashboard_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_chat_id" ON "llm_usage" ("chat_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_request_id" ON "llm_usage" ("request_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_dashboard_id" ON "llm_usage" ("dashboard_id");

-- Populate dashboard_id in existing llm_usage records
UPDATE "llm_usage" 
SET "dashboard_id" = (
  SELECT c."dashboard_id" 
  FROM "chats" c 
  WHERE c."id" = "llm_usage"."chat_id"
)
WHERE "llm_usage"."dashboard_id" IS NULL 
  AND "llm_usage"."chat_id" IS NOT NULL;