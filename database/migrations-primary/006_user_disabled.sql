-- Migration 006: Add disabled column to users table
-- Database: handled
-- Schema: config
-- Date: 2024-12-08

-- Add disabled column to users table
ALTER TABLE config.users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for disabled status (useful for filtering active users)
CREATE INDEX IF NOT EXISTS idx_users_disabled ON config.users(disabled);

-- Comment
COMMENT ON COLUMN config.users.disabled IS 'Whether the user account is disabled and cannot login';

