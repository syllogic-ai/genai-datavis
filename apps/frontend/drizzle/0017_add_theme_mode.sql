-- Add theme_mode field to dashboards table
ALTER TABLE "dashboards" ADD COLUMN "theme_mode" text DEFAULT 'light' NOT NULL;