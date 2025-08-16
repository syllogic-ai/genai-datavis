-- Migration: Remove foreign key constraints for analytics preservation
-- This allows jobs and llm_usage records to be preserved when dashboards/chats are deleted

-- 1. Drop foreign key constraint from jobs table (dashboard_id)
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_dashboard_id_dashboards_id_fk";

-- 2. Drop foreign key constraint from llm_usage table (chat_id)  
ALTER TABLE "llm_usage" DROP CONSTRAINT IF EXISTS "llm_usage_chat_id_chats_id_fk";

-- 3. Add new columns to llm_usage table for better analytics
ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "dashboard_id" text;

-- 4. Create indexes for better query performance on text fields
CREATE INDEX IF NOT EXISTS "idx_jobs_dashboard_id" ON "jobs" ("dashboard_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_chat_id" ON "llm_usage" ("chat_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_request_id" ON "llm_usage" ("request_id");
CREATE INDEX IF NOT EXISTS "idx_llm_usage_dashboard_id" ON "llm_usage" ("dashboard_id");

-- 5. Update existing llm_usage records to populate dashboard_id from associated chats
UPDATE "llm_usage" 
SET "dashboard_id" = (
  SELECT c."dashboard_id" 
  FROM "chats" c 
  WHERE c."id" = "llm_usage"."chat_id"
)
WHERE "llm_usage"."dashboard_id" IS NULL 
  AND "llm_usage"."chat_id" IS NOT NULL;