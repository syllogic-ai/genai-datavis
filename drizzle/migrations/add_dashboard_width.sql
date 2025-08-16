-- Add width column to dashboards table
ALTER TABLE "dashboards" ADD COLUMN "width" text DEFAULT 'full' NOT NULL;