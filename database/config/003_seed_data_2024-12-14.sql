-- ============================================================================
-- Config Schema - Seed Data Baseline
-- Date: 2024-12-14
-- Purpose: Seed roles, permissions, and role-permission mappings
-- ============================================================================
-- All INSERT statements use ON CONFLICT DO NOTHING for idempotency
-- Safe to run multiple times without duplication
-- ============================================================================

-- ==================================================
-- SEED ROLES
-- ==================================================
-- Current production roles: admin, customer_service, 3pl_ops, 3pl_manager, 3pl_viewer
-- ==================================================

INSERT INTO config.roles (code, name, description, icon, is_system) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 'shield-check', true),
  ('customer_service', 'Customer Service', 'Help customers, view orders, manage customer data', 'headphones', false),
  ('3pl_ops', '3PL Operations', 'Daily warehouse operations, imports, transformations', 'package', false),
  ('3pl_manager', '3PL Manager', 'Oversee 3PL operations, full access to 3PL settings', 'package-check', false),
  ('3pl_viewer', '3PL Viewer', 'Read-only access to 3PL data for reporting', 'eye', false)
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- SEED PERMISSIONS
-- ==================================================
-- All permissions from migrations 007, 009, 011
-- ==================================================

INSERT INTO config.permissions (code, name, description, category) VALUES
  -- Admin permissions
  ('manage_users', 'Manage Users', 'Create, edit, and delete user accounts', 'admin'),
  ('manage_roles', 'Manage Roles', 'Configure role permissions', 'admin'),
  ('view_users', 'View Users', 'See user list and user details', 'admin'),
  ('view_roles', 'View Roles', 'See role structure and permission assignments', 'admin'),
  ('view_dashboard', 'View Dashboard', 'Access system dashboard and overview', 'admin'),
  ('view_settings', 'View Settings', 'View system settings', 'admin'),
  ('manage_settings', 'Manage Settings', 'Modify system configuration', 'admin'),
  
  -- Client/Customer permissions
  ('view_clients', 'View Clients', 'View client information and contracts', 'clients'),
  ('manage_clients', 'Manage Clients', 'Create and modify client records', 'clients'),
  
  -- Inventory permissions
  ('view_inventory', 'View Inventory', 'View stock levels and locations', 'inventory'),
  ('manage_inventory', 'Manage Inventory', 'Adjust inventory and manage locations', 'inventory'),
  
  -- Operations permissions
  ('view_receiving', 'View Receiving', 'View inbound shipments and receipts', 'operations'),
  ('manage_receiving', 'Manage Receiving', 'Process receipts and putaway tasks', 'operations'),
  ('view_operations', 'View Operations', 'View labor and productivity metrics', 'operations'),
  ('manage_operations', 'Manage Operations', 'Manage tasks and warehouse operations', 'operations'),
  
  -- Fulfillment permissions
  ('view_orders', 'View Orders', 'View order details and status', 'fulfillment'),
  ('manage_orders', 'Manage Orders', 'Process picks, packs, and shipments', 'fulfillment'),
  ('view_shipping', 'View Shipping', 'View shipments and tracking', 'fulfillment'),
  ('manage_shipping', 'Manage Shipping', 'Create shipments and print labels', 'fulfillment'),
  ('view_returns', 'View Returns', 'View return requests and status', 'fulfillment'),
  ('manage_returns', 'Manage Returns', 'Process returns and dispositions', 'fulfillment'),
  
  -- Billing permissions
  ('view_billing', 'View Billing', 'View invoices and payments', 'billing'),
  ('manage_billing', 'Manage Billing', 'Create invoices and process payments', 'billing'),
  
  -- Reports permissions
  ('view_reports', 'View Reports', 'Access reports and analytics', 'reports'),
  
  -- Integrations permissions
  ('view_integrations', 'View Integrations', 'View integration status and logs', 'integrations'),
  ('manage_integrations', 'Manage Integrations', 'Configure and run integrations', 'integrations'),
  
  -- Data permissions (legacy from initial RBAC)
  ('view_data', 'View Data', 'View data and reports', 'data'),
  ('import_data', 'Import Data', 'Upload and import data files', 'data'),
  ('export_data', 'Export Data', 'Download and export data', 'data'),
  ('run_transformations', 'Run Transformations', 'Execute data transformations', 'data'),
  
  -- 3PL-specific permissions
  ('view_3pl', 'View 3PL', 'View all 3PL operational data', '3pl'),
  ('manage_3pl_settings', 'Manage 3PL Settings', 'Configure 3PL system settings', '3pl')
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ==================================================

-- ------------------------------------
-- ADMIN: All permissions
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- CUSTOMER_SERVICE: Customer-facing operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = 'customer_service'
  AND p.code IN (
    -- View access
    'view_dashboard',
    'view_clients',
    'view_orders',
    'view_inventory',
    'view_shipping',
    'view_billing',
    'view_reports',
    -- Manage returns (customer service handles returns)
    'view_returns', 'manage_returns',
    -- Export data for reports
    'export_data'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_OPS: Daily warehouse operations
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_ops'
  AND p.code IN (
    -- View access to 3PL data
    'view_3pl',
    'view_dashboard',
    'view_inventory',
    'view_receiving',
    'view_orders',
    'view_shipping',
    'view_operations',
    -- Operational permissions
    'manage_inventory',
    'manage_receiving',
    'manage_orders',
    'manage_shipping',
    'manage_operations',
    -- Data operations
    'import_data',
    'export_data',
    'run_transformations',
    'view_integrations'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_MANAGER: Full 3PL access
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_manager'
  AND (
    -- All 3PL permissions
    p.code IN ('view_3pl', 'manage_3pl_settings')
    -- All operational permissions
    OR p.code IN (
      'view_dashboard',
      'view_inventory', 'manage_inventory',
      'view_receiving', 'manage_receiving',
      'view_orders', 'manage_orders',
      'view_shipping', 'manage_shipping',
      'view_returns', 'manage_returns',
      'view_operations', 'manage_operations',
      'view_billing', 'manage_billing'
    )
    -- All data permissions
    OR p.code IN (
      'import_data',
      'export_data',
      'run_transformations',
      'view_integrations',
      'manage_integrations'
    )
    -- Reports
    OR p.code = 'view_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------
-- 3PL_VIEWER: Read-only 3PL access
-- ------------------------------------
INSERT INTO config.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM config.roles r
CROSS JOIN config.permissions p
WHERE r.code = '3pl_viewer'
  AND p.code IN (
    -- All view permissions
    'view_3pl',
    'view_dashboard',
    'view_clients',
    'view_inventory',
    'view_receiving',
    'view_orders',
    'view_shipping',
    'view_returns',
    'view_operations',
    'view_billing',
    'view_reports',
    'view_integrations',
    -- Export for reporting
    'export_data'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify roles were created
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM config.roles;
  IF role_count >= 5 THEN
    RAISE NOTICE '✓ Roles seeded successfully: % roles', role_count;
  ELSE
    RAISE WARNING '⚠ Expected at least 5 roles, found %', role_count;
  END IF;
END $$;

-- Verify permissions were created
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM config.permissions;
  IF perm_count >= 30 THEN
    RAISE NOTICE '✓ Permissions seeded successfully: % permissions', perm_count;
  ELSE
    RAISE WARNING '⚠ Expected at least 30 permissions, found %', perm_count;
  END IF;
END $$;

-- Verify role-permission mappings
DO $$
DECLARE
  admin_perms INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_perms 
  FROM config.role_permissions rp
  JOIN config.roles r ON rp.role_id = r.id
  WHERE r.code = 'admin' AND rp.granted = true;
  
  IF admin_perms > 0 THEN
    RAISE NOTICE '✓ Admin role has % permissions assigned', admin_perms;
  ELSE
    RAISE WARNING '⚠ Admin role has no permissions assigned';
  END IF;
END $$;
