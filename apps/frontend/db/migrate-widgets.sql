-- Migration script to update widgets table structure
-- Run this against your database to update the schema

-- First, let's create a backup of existing data if any
CREATE TABLE IF NOT EXISTS widgets_backup AS SELECT * FROM widgets;

-- Drop the existing widgets table (if you have important data, modify this approach)
DROP TABLE IF EXISTS widgets;

-- Recreate widgets table with new structure
CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB NOT NULL,
  data JSONB,
  layout JSONB NOT NULL,
  chat_id TEXT REFERENCES chats(id),
  is_configured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);
CREATE INDEX idx_widgets_type ON widgets(type);
CREATE INDEX idx_widgets_created_at ON widgets(created_at);

-- If you need to migrate data from the backup, you would need to transform it
-- This would depend on your existing data structure
-- Example migration (adjust based on your current data):
-- INSERT INTO widgets (id, dashboard_id, type, config, layout, created_at)
-- SELECT 
--   id,
--   dashboard_id,
--   CASE 
--     WHEN chart_type = 'bar' THEN 'chart'
--     WHEN chart_type = 'line' THEN 'chart'
--     WHEN chart_type = 'pie' THEN 'chart'
--     WHEN chart_type = 'table' THEN 'table'
--     ELSE 'chart'
--   END as type,
--   COALESCE(chart_specs, '{}') as config,
--   jsonb_build_object(
--     'i', id,
--     'x', COALESCE((position->>'x')::int, 0),
--     'y', COALESCE((position->>'y')::int, 0), 
--     'w', COALESCE((position->>'width')::int, 4),
--     'h', COALESCE((position->>'height')::int, 2),
--     'isResizable', false
--   ) as layout,
--   created_at
-- FROM widgets_backup;

-- Clean up backup table (uncomment when you're confident the migration worked)
-- DROP TABLE widgets_backup; 