-- ============================================================================
-- Config Schema - Structure Baseline
-- Date: 2024-12-14
-- Purpose: Consolidated baseline for config schema tables, indexes, functions
-- ============================================================================
-- This baseline combines migrations: 000, 001, 002, 003, 006, 007, 011, 014
-- ============================================================================

-- ==================================================
-- SCHEMA
-- ==================================================

CREATE SCHEMA IF NOT EXISTS config;

COMMENT ON SCHEMA config IS 'Configuration data - User authentication, roles, permissions, integration tracking';

-- ==================================================
-- MIGRATION TRACKING TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.schema_migrations (
    version VARCHAR(10) NOT NULL,
    schema_name VARCHAR(50) NOT NULL DEFAULT 'legacy',
    description TEXT NOT NULL,
    applied_by VARCHAR(100) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    execution_time_ms INTEGER,
    checksum TEXT,
    PRIMARY KEY (version, schema_name)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_schema 
  ON config.schema_migrations(schema_name, version);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
  ON config.schema_migrations(applied_at DESC);

COMMENT ON TABLE config.schema_migrations IS 'Tracks applied migrations with schema folder support';
COMMENT ON COLUMN config.schema_migrations.schema_name IS 'Schema folder name (config, customer, workspace, reference) or legacy for pre-consolidation migrations';

-- ==================================================
-- USERS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    name TEXT NOT NULL,
    disabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Lifecycle management (deleted for test accounts, disabled for real users)
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT REFERENCES config.users(id),
    deleted_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON config.users(email);
CREATE INDEX IF NOT EXISTS idx_users_disabled ON config.users(disabled);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON config.users(deleted) WHERE deleted = false;

COMMENT ON TABLE config.users IS 'User accounts for Lucia Auth';
COMMENT ON COLUMN config.users.disabled IS 'Whether the user account is disabled and cannot login';

-- ==================================================
-- SESSIONS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES config.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON config.sessions(user_id);

COMMENT ON TABLE config.sessions IS 'Active sessions for Lucia Auth';

-- ==================================================
-- ROLES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'shield',
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Lifecycle management (roles only retire, never delete)
    retired BOOLEAN DEFAULT false,
    retired_at TIMESTAMPTZ,
    retired_by TEXT REFERENCES config.users(id),
    retired_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON config.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_retired ON config.roles(retired) WHERE retired = false;

COMMENT ON TABLE config.roles IS 'User roles for access control';
COMMENT ON COLUMN config.roles.code IS 'Unique role identifier (e.g., admin, customer_service, 3pl_ops)';
COMMENT ON COLUMN config.roles.icon IS 'Lucide icon name (e.g., shield, crown, package)';
COMMENT ON COLUMN config.roles.is_system IS 'System roles cannot be deleted';

-- Constraint: System roles cannot be retired
ALTER TABLE config.roles ADD CONSTRAINT IF NOT EXISTS check_system_not_retired
  CHECK (is_system = false OR retired = false);

-- ==================================================
-- PERMISSIONS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON config.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON config.permissions(category);

COMMENT ON TABLE config.permissions IS 'Available system permissions';
COMMENT ON COLUMN config.permissions.code IS 'Unique permission identifier';
COMMENT ON COLUMN config.permissions.category IS 'Permission category: admin, operations, integrations, clients, inventory, fulfillment, billing, reports';

-- ==================================================
-- ROLE_PERMISSIONS JUNCTION TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.role_permissions (
    role_id INTEGER NOT NULL REFERENCES config.roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES config.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON config.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON config.role_permissions(permission_id);

COMMENT ON TABLE config.role_permissions IS 'Assigns permissions to roles';
COMMENT ON COLUMN config.role_permissions.granted IS 'True = granted, false = denied (for future use)';

-- ==================================================
-- USER_ROLES JUNCTION TABLE (Many-to-Many)
-- ==================================================

CREATE TABLE IF NOT EXISTS config.user_roles (
    user_id TEXT NOT NULL REFERENCES config.users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES config.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON config.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON config.user_roles(role_id);

COMMENT ON TABLE config.user_roles IS 'Many-to-many: Users can have multiple roles, effective permissions are UNION';

-- ==================================================
-- INTEGRATION_RUNS TABLE
-- ==================================================

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

CREATE INDEX IF NOT EXISTS idx_integration_runs_integration_id ON config.integration_runs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_status ON config.integration_runs(status);
CREATE INDEX IF NOT EXISTS idx_integration_runs_created_at ON config.integration_runs(created_at DESC);

COMMENT ON TABLE config.integration_runs IS 'Runtime history of integration imports - definitions are in code';
COMMENT ON COLUMN config.integration_runs.integration_id IS 'Matches the id field in code-defined Integration';
COMMENT ON COLUMN config.integration_runs.status IS 'pending, running, success, failed';

-- ==================================================
-- FUNCTIONS
-- ==================================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION config.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION config.update_updated_at() IS 'Trigger function to automatically update updated_at column';

-- ==================================================
-- TRIGGERS
-- ==================================================

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON config.users
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at();

CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON config.roles
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at();

-- ==================================================
-- BASELINE MARKER
-- ==================================================

COMMENT ON SCHEMA config IS 'Config schema baseline established 2024-12-14 - Consolidation of migrations 000-014';
