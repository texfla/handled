-- ============================================================================
-- Update Migration Tracking Schema for Schema Folders
-- ============================================================================
-- This is a ONE-TIME migration to update the tracking table structure
-- Run this BEFORE running the new migration system for the first time
--
-- Usage (on production):
--   psql "$PRIMARY_DATABASE_URL" -f database/update-tracking-schema.sql
--
-- Usage (on dev):
--   psql "$PRIMARY_DATABASE_URL" -f database/update-tracking-schema.sql
-- ============================================================================

BEGIN;

-- Step 1: Add schema_name column
ALTER TABLE config.schema_migrations 
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50);

-- Step 2: Backfill existing entries (CRITICAL: must happen before composite PK)
-- All old migrations get marked as 'legacy' to avoid NULL issues
UPDATE config.schema_migrations 
SET schema_name = 'legacy' 
WHERE schema_name IS NULL;

-- Step 3: Set default for new entries
ALTER TABLE config.schema_migrations 
  ALTER COLUMN schema_name SET DEFAULT 'legacy';

-- Step 4: Make NOT NULL (now safe since all NULLs are filled)
ALTER TABLE config.schema_migrations 
  ALTER COLUMN schema_name SET NOT NULL;

-- Step 5: Add index
CREATE INDEX IF NOT EXISTS idx_schema_migrations_schema 
  ON config.schema_migrations(schema_name, version);

-- Step 6: Update constraint to composite key (version, schema_name)
-- Old entries: (001, 'legacy'), (002, 'legacy'), etc.
-- New entries: (001, 'config'), (001, 'customer'), (002, 'config'), etc.
ALTER TABLE config.schema_migrations 
  DROP CONSTRAINT IF EXISTS schema_migrations_pkey;

ALTER TABLE config.schema_migrations 
  ADD PRIMARY KEY (version, schema_name);

-- Step 7: Update comment
COMMENT ON COLUMN config.schema_migrations.schema_name 
  IS 'Schema folder name (config, customer, workspace, reference) or legacy for pre-consolidation migrations';

-- Step 8: Verify the change
DO $$
DECLARE
  legacy_count INTEGER;
  schema_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count 
  FROM config.schema_migrations 
  WHERE schema_name = 'legacy';
  
  SELECT COUNT(*) INTO schema_count 
  FROM config.schema_migrations 
  WHERE schema_name != 'legacy';
  
  RAISE NOTICE '✓ Migration tracking updated successfully';
  RAISE NOTICE '  Legacy entries: %', legacy_count;
  RAISE NOTICE '  Schema-folder entries: %', schema_count;
  RAISE NOTICE '  Composite PK: (version, schema_name)';
END $$;

COMMIT;

-- Show recent migrations
SELECT version, schema_name, description, applied_at 
FROM config.schema_migrations 
ORDER BY applied_at DESC 
LIMIT 10;
