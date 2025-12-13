-- ============================================================================
-- Migration 011: Many Roles Per User + View Permissions
-- ============================================================================

-- 1. CREATE USER_ROLES JUNCTION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config.user_roles (
  user_id TEXT NOT NULL REFERENCES config.users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES config.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON config.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON config.user_roles(role_id);

COMMENT ON TABLE config.user_roles IS 'Many-to-many relationship between users and roles';

-- 2. MIGRATE EXISTING USERS
-- ----------------------------------------------------------------------------
-- Temporarily assign all existing users to admin role during migration
-- Manual reassignment required post-deployment

INSERT INTO config.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM config.users u
CROSS JOIN config.roles r
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- 3. ADD VIEW PERMISSIONS
-- ----------------------------------------------------------------------------
INSERT INTO config.permissions (code, name, description, category) VALUES
  -- Admin view permissions
  ('view_users', 'View Users', 'See user list and user details', 'admin'),
  ('view_roles', 'View Roles', 'See role structure and permission assignments', 'admin'),
  
  -- Operations view permissions
  ('view_orders', 'View Orders', 'See order list and order details', 'operations'),
  ('view_inventory', 'View Inventory', 'See inventory levels and locations', 'operations'),
  ('view_clients', 'View Clients', 'See customer list and customer details', 'operations'),
  ('view_receiving', 'View Receiving', 'See inbound shipments and receipts', 'operations'),
  ('view_shipping', 'View Shipping', 'See outbound shipments and tracking', 'operations'),
  ('view_returns', 'View Returns', 'See return requests and status', 'operations'),
  ('view_billing', 'View Billing', 'See invoices and billing information', 'operations'),
  ('view_reports', 'View Reports', 'Access analytics and reporting', 'operations'),
  
  -- Integration view permissions
  ('view_integrations', 'View Integrations', 'See integration status and history', 'integrations')
ON CONFLICT (code) DO NOTHING;

-- 4. CREATE NEW FOCUSED ROLES
-- ----------------------------------------------------------------------------
INSERT INTO config.roles (code, name, description, is_system) VALUES
  ('warehouse_picker', 'Warehouse Picker', 'Pick and pack orders - focused workflow', false),
  ('warehouse_lead', 'Warehouse Lead', 'Manage warehouse operations and team', false),
  ('client_service', 'Client Service Representative', 'Customer service and support', false),
  ('salesperson', 'Salesperson', 'Sales and customer acquisition', false),
  ('sales_manager', 'Sales Manager', 'Sales team management and oversight', false),
  ('billing_manager', 'Billing Manager', 'Financial operations and billing', false),
  ('data_analyst', 'Data Analyst', 'Data imports, exports, and reporting', false),
  ('superuser', 'Superuser', 'Full operational access and user management (no security config)', false),
  ('system_admin', 'System Administrator', 'System configuration only (no customer data access)', false)
ON CONFLICT (code) DO NOTHING;

-- 5. ASSIGN PERMISSIONS: warehouse_picker
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'warehouse_picker'
  AND p.code IN (
    'view_orders',
    'view_inventory'
  )
ON CONFLICT DO NOTHING;

-- 6. ASSIGN PERMISSIONS: warehouse_lead
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'warehouse_lead'
  AND p.code IN (
    'view_orders', 'manage_orders',
    'view_inventory', 'manage_inventory',
    'view_receiving', 'manage_receiving',
    'view_shipping', 'manage_shipping'
  )
ON CONFLICT DO NOTHING;

-- 7. ASSIGN PERMISSIONS: client_service
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'client_service'
  AND p.code IN (
    'view_clients',
    'view_orders',
    'view_inventory',
    'view_shipping',
    'view_returns', 'manage_returns'
  )
ON CONFLICT DO NOTHING;

-- 8. ASSIGN PERMISSIONS: salesperson
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'salesperson'
  AND p.code IN (
    'view_clients', 'manage_clients',
    'view_orders',
    'view_inventory',
    'view_reports'
  )
ON CONFLICT DO NOTHING;

-- 9. ASSIGN PERMISSIONS: sales_manager
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'sales_manager'
  AND p.code IN (
    'view_clients', 'manage_clients',
    'view_orders', 'manage_orders',
    'view_inventory',
    'view_reports'
  )
ON CONFLICT DO NOTHING;

-- 10. ASSIGN PERMISSIONS: billing_manager
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'billing_manager'
  AND p.code IN (
    'view_clients',
    'view_orders',
    'view_billing', 'manage_billing'
  )
ON CONFLICT DO NOTHING;

-- 11. ASSIGN PERMISSIONS: data_analyst
-- ----------------------------------------------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'data_analyst'
  AND p.code IN (
    'view_integrations',
    'import_data',
    'export_data',
    'run_transformations',
    'view_reports'
  )
ON CONFLICT DO NOTHING;

-- 12. ASSIGN PERMISSIONS: superuser
-- ----------------------------------------------------------------------------
-- Full operational access + user management
-- Key: Has view_roles (via manage_users implication) but NOT manage_roles

INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'superuser'
  AND (
    -- All view permissions
    p.code LIKE 'view_%'
    
    -- All operational manage permissions
    OR p.code IN (
      'manage_orders',
      'manage_inventory',
      'manage_receiving',
      'manage_shipping',
      'manage_returns',
      'manage_billing',
      'manage_clients'
    )
    
    -- User management (implies view_roles via implications)
    OR p.code = 'manage_users'
    
    -- Data permissions
    OR p.code IN (
      'import_data',
      'export_data',
      'run_transformations'
    )
  )
  -- Explicitly exclude security configuration
  AND p.code != 'manage_roles'
ON CONFLICT DO NOTHING;

-- 13. ASSIGN PERMISSIONS: system_admin
-- ----------------------------------------------------------------------------
-- System configuration only, no customer/operational data access
-- Use case: External IT consultant who maintains system

INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'system_admin'
  AND p.code IN (
    'view_users', 'manage_users',
    'view_roles', 'manage_roles',
    'view_integrations'
  )
ON CONFLICT DO NOTHING;

-- 14. UPDATE ADMIN ROLE
-- ----------------------------------------------------------------------------
-- Ensure admin has ALL permissions (including new view permissions)

INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- 15. UPDATE EXISTING ROLES WITH VIEW PERMISSIONS
-- ----------------------------------------------------------------------------
-- Add view permissions to existing roles based on their manage permissions

-- Manager role: add all view permissions
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'manager'
  AND p.code LIKE 'view_%'
ON CONFLICT DO NOTHING;

-- 16. DROP OLD COLUMNS (BREAKING CHANGE)
-- ----------------------------------------------------------------------------
-- Remove single-role foreign key columns

ALTER TABLE config.users DROP COLUMN IF EXISTS role_id;
ALTER TABLE config.users DROP COLUMN IF EXISTS role; -- deprecated string column if exists

-- 17. ADD COMMENTS
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN config.permissions.category IS 'Permission category: admin, operations, integrations, reporting';
COMMENT ON TABLE config.user_roles IS 'Many-to-many: Users can have multiple roles, effective permissions are UNION';

-- Migration complete

