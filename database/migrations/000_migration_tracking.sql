-- Migration 000: Create migration tracking system
-- Database: handled
-- Schema: config
-- Date: 2024-12-08
-- Purpose: Track which migrations have been applied to prevent duplicate runs

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS config.schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applied_by VARCHAR(100),
    execution_time_ms INTEGER
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
    ON config.schema_migrations(applied_at DESC);

-- Comments
COMMENT ON TABLE config.schema_migrations IS 'Tracks which database migrations have been applied and when';
COMMENT ON COLUMN config.schema_migrations.version IS 'Migration file number (e.g., 001, 002)';
COMMENT ON COLUMN config.schema_migrations.description IS 'Human-readable description of what the migration does';
COMMENT ON COLUMN config.schema_migrations.applied_at IS 'Timestamp when migration was applied';
COMMENT ON COLUMN config.schema_migrations.applied_by IS 'System user who applied the migration';
COMMENT ON COLUMN config.schema_migrations.execution_time_ms IS 'How long the migration took to execute';

-- Insert this migration as already applied
INSERT INTO config.schema_migrations (version, description, applied_by)
VALUES ('000', 'Create migration tracking system', CURRENT_USER)
ON CONFLICT (version) DO NOTHING;

