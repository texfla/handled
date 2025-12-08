-- Migration 001: Create database schemas
-- Database: handled
-- Date: 2024-12-06

-- Create schemas
CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS workspace;
CREATE SCHEMA IF NOT EXISTS reference;

-- Grant permissions to handled_user
GRANT ALL ON SCHEMA config TO handled_user;
GRANT ALL ON SCHEMA workspace TO handled_user;
GRANT ALL ON SCHEMA reference TO handled_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA config GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA workspace GRANT ALL ON TABLES TO handled_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA reference GRANT ALL ON TABLES TO handled_user;

-- Comments
COMMENT ON SCHEMA config IS 'Authentication, integration runs, system configuration';
COMMENT ON SCHEMA workspace IS 'Raw imported data - disposable, can be rebuilt from files';
COMMENT ON SCHEMA reference IS 'Transformed data - carriers, delivery_matrix, demographics';

