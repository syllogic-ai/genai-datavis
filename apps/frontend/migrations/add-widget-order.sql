-- Migration: Add order-based positioning to replace complex grid layout
-- Replace layout jsonb with simple order integer

BEGIN;

-- Add the new order column
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 0;

-- Populate order based on existing layout y position (if layout exists)
UPDATE widgets 
SET order_position = COALESCE((layout->>'y')::integer, 0)
WHERE layout IS NOT NULL;

-- For widgets without layout, set order based on created_at
WITH ordered_widgets AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY created_at) - 1 as new_order
  FROM widgets 
  WHERE layout IS NULL OR order_position = 0
)
UPDATE widgets 
SET order_position = ordered_widgets.new_order
FROM ordered_widgets
WHERE widgets.id = ordered_widgets.id;

-- Make order_position NOT NULL after populating
ALTER TABLE widgets ALTER COLUMN order_position SET NOT NULL;

-- Rename column to just 'order'
ALTER TABLE widgets RENAME COLUMN order_position TO "order";

-- Drop the old layout column (commented out for safety - uncomment when ready)
-- ALTER TABLE widgets DROP COLUMN IF EXISTS layout;

COMMIT;