-- Add is_public field to dashboards table
ALTER TABLE "dashboards" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;