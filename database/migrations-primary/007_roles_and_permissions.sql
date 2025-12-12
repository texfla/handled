-- Migration 007: Create roles and permissions system
-- Database: handled
-- Schema: config
-- Date: 2024-12-08
-- Purpose: Implement RBAC with predefined roles and configurable permissions

-- ==================================================
-- ROLES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS config.roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON config.roles(code);

COMMENT ON TABLE config.roles IS 'User roles for access control';
COMMENT ON COLUMN config.roles.code IS 'Unique role identifier (e.g., admin, sales)';
COMMENT ON COLUMN config.roles.is_system IS 'System roles cannot be deleted';

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
COMMENT ON COLUMN config.permissions.category IS 'Permission grouping (admin, data, operations)';

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
-- SEED PREDEFINED ROLES
-- ==================================================

INSERT INTO config.roles (code, name, description, is_system) VALUES
    ('admin', 'Administrator', 'Full system access with all permissions', true),
    ('sales', 'Sales', 'View and export data for sales operations', false),
    ('warehouse', 'Warehouse', 'Manage inventory, imports, and transformations', false),
    ('user', 'User', 'Basic read-only access to data', false)
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- SEED PERMISSIONS
-- ==================================================

INSERT INTO config.permissions (code, name, description, category) VALUES
    -- Admin permissions
    ('manage_users', 'Manage Users', 'Create, edit, and delete user accounts', 'admin'),
    ('manage_roles', 'Manage Roles', 'Configure role permissions', 'admin'),
    
    -- Data permissions
    ('view_data', 'View Data', 'View data and reports', 'data'),
    ('import_data', 'Import Data', 'Upload and import data files', 'data'),
    ('export_data', 'Export Data', 'Download and export data', 'data'),
    ('run_transformations', 'Run Transformations', 'Execute data transformations', 'data')
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ==================================================

-- Admin: All permissions
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales: view_data, export_data
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'sales' 
  AND p.code IN ('view_data', 'export_data')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Warehouse: view_data, import_data, run_transformations
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'warehouse' 
  AND p.code IN ('view_data', 'import_data', 'run_transformations')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: view_data only
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'user' 
  AND p.code = 'view_data'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==================================================
-- MIGRATE EXISTING USERS
-- ==================================================

-- Add role_id column to users table
ALTER TABLE config.users ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_role_id'
    ) THEN
        ALTER TABLE config.users 
            ADD CONSTRAINT fk_users_role_id 
            FOREIGN KEY (role_id) 
            REFERENCES config.roles(id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Migrate existing users from string role to role_id
UPDATE config.users u
SET role_id = r.id
FROM config.roles r
WHERE u.role_id IS NULL
  AND LOWER(u.role) = r.code;

-- Set any remaining users without a valid role to 'user' role
UPDATE config.users u
SET role_id = (SELECT id FROM config.roles WHERE code = 'user')
WHERE u.role_id IS NULL;

-- Make role_id NOT NULL after migration
ALTER TABLE config.users ALTER COLUMN role_id SET NOT NULL;

-- Create index on role_id
CREATE INDEX IF NOT EXISTS idx_users_role_id ON config.users(role_id);

-- Add updated_at trigger for roles table
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON config.roles
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at();

COMMENT ON COLUMN config.users.role_id IS 'Foreign key to roles table';

-- ==================================================
-- VERIFICATION QUERY
-- ==================================================
-- Run after migration to verify:
-- SELECT r.name, COUNT(u.id) as user_count
-- FROM config.roles r
-- LEFT JOIN config.users u ON u.role_id = r.id
-- GROUP BY r.id, r.name
-- ORDER BY r.name;

