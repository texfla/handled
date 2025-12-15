-- Migration 003: Create integration runtime tables
-- Database: handled
-- Schema: config
-- Date: 2024-12-06

-- Integration runs table (tracks import history, NOT definitions)
CREATE TABLE IF NOT EXISTS config.integration_runs (
    id SERIAL PRIMARY KEY,
    integration_id TEXT NOT NULL,
    filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    run_by TEXT REFERENCES config.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_runs_integration_id ON config.integration_runs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_status ON config.integration_runs(status);
CREATE INDEX IF NOT EXISTS idx_integration_runs_created_at ON config.integration_runs(created_at DESC);

-- Comments
COMMENT ON TABLE config.integration_runs IS 'Runtime history of integration imports - definitions are in code';
COMMENT ON COLUMN config.integration_runs.integration_id IS 'Matches the id field in code-defined Integration';
COMMENT ON COLUMN config.integration_runs.status IS 'pending, running, success, failed';

