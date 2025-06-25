-- Migration: Move chats from file-based to dashboard-based
-- This migration consolidates chats by dashboard and updates foreign key relationships

BEGIN;

-- Step 1: Add dashboard_id column to chats table
ALTER TABLE chats 
ADD COLUMN dashboard_id TEXT;

-- Step 2: Add foreign key constraint for dashboard_id
ALTER TABLE chats 
ADD CONSTRAINT chats_dashboard_id_fkey 
FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;

-- Step 3: Populate dashboard_id based on existing file_id relationships
-- For each chat with a file_id, find the dashboard that uses that file
UPDATE chats 
SET dashboard_id = (
    SELECT d.id 
    FROM dashboards d 
    WHERE d.file_id = chats.file_id
    LIMIT 1
)
WHERE file_id IS NOT NULL;

-- Step 4: For chats without file_id or where no dashboard matches, 
-- we'll keep them linked to the first dashboard of the user as fallback
UPDATE chats 
SET dashboard_id = (
    SELECT d.id 
    FROM dashboards d 
    WHERE d.user_id = chats.user_id 
    ORDER BY d.created_at ASC 
    LIMIT 1
)
WHERE dashboard_id IS NULL;

-- Step 5: Clean up orphaned chats (chats where user has no dashboards)
DELETE FROM chats 
WHERE dashboard_id IS NULL;

-- Step 6: Make dashboard_id NOT NULL now that all valid records have been updated
ALTER TABLE chats 
ALTER COLUMN dashboard_id SET NOT NULL;

-- Step 7: Drop the old file_id column and its constraint
ALTER TABLE chats 
DROP CONSTRAINT IF EXISTS chats_file_id_fkey;

ALTER TABLE chats 
DROP COLUMN file_id;

-- Step 8: Add index on dashboard_id for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_dashboard_id ON chats(dashboard_id);

-- Step 9: Update any existing chat titles to reflect dashboard context
UPDATE chats 
SET title = COALESCE(
    (SELECT d.name || ' Chat' FROM dashboards d WHERE d.id = chats.dashboard_id),
    'Dashboard Chat'
)
WHERE title = 'New Chat' OR title IS NULL;

COMMIT;