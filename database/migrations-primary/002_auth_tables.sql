-- Migration 002: Create auth tables for Lucia Auth
-- Database: handled
-- Schema: config
-- Date: 2024-12-06

-- Users table
CREATE TABLE IF NOT EXISTS config.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Sessions table (for Lucia Auth)
CREATE TABLE IF NOT EXISTS config.sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES config.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON config.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON config.users(email);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION config.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON config.users
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at();

-- Comments
COMMENT ON TABLE config.users IS 'User accounts for Lucia Auth';
COMMENT ON TABLE config.sessions IS 'Active sessions for Lucia Auth';

